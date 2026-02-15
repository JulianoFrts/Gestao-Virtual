import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import {
  createUserSchema,
  updateUserSchema,
  paginationSchema,
  userFiltersSchema,
  validate,
} from "@/lib/utils/validators/schemas";
import * as authSession from "@/lib/auth/session";
import { publicUserSelect, buildUserWhereClause } from "@/types/database";
import { logger } from "@/lib/utils/logger";
import { MESSAGES } from "@/lib/constants";
import { isGodRole, SECURITY_RANKS } from "@/lib/constants/security";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";


// DI (Manual)
const userRepository = new PrismaUserRepository();
const systemAuditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, systemAuditRepository);

// Helpers locais removidos em favor de @/lib/auth/session

// ===== HEAD (Health Check) =====
export async function HEAD() {
  return ApiResponse.noContent();
}

// ===== GET USERS =====
export async function GET(request: NextRequest) {
  try {
    const currentUser = await authSession.requireAuth();
    const isAdmin = authSession.isUserAdmin(
      currentUser.role,
      (currentUser as any).hierarchyLevel,
    );

    const searchParams = request.nextUrl.searchParams;

    // Validação de paginação
    const paginationResult = validate(paginationSchema, {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    if (!paginationResult.success) {
      return ApiResponse.validationError(paginationResult.errors);
    }

    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
    } = paginationResult.data as {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: string;
    };

    // Validação de filtros
    const filtersResult = validate(userFiltersSchema, {
      id: searchParams.get("id"),
      search: searchParams.get("search"),
      role: searchParams.get("role"),
      status: searchParams.get("status"),
      emailVerified: searchParams.get("emailVerified"),
      createdAfter: searchParams.get("createdAfter"),
      createdBefore: searchParams.get("createdBefore"),
      projectId:
        searchParams.get("projectId") || searchParams.get("project_id"),
      siteId: searchParams.get("siteId") || searchParams.get("site_id"),
      companyId:
        searchParams.get("companyId") || searchParams.get("company_id"),
      onlyCorporate: searchParams.get("onlyCorporate"),
      excludeCorporate: searchParams.get("excludeCorporate"),
    });

    if (!filtersResult.success) {
      return ApiResponse.validationError(filtersResult.errors);
    }

    const filters = filtersResult.data as any;

    // Lógica Especial: Se estiver filtrando por um ID único, retornar o perfil completo (com permissões)
    if (filters.id && !filters.search) {
      // Segurança: Apenas admins podem ver perfil de outros, ou o próprio usuário pode ver o seu
      if (isAdmin || filters.id === currentUser.id) {
        try {
          const profile = await userService.getProfile(filters.id);
          return ApiResponse.json({
            items: [profile],
            pagination: {
              page: 1,
              limit: 1,
              total: 1,
              pages: 1,
              hasNext: false,
              hasPrev: false,
            },
          });
        } catch (err: any) {
          if (err.message === "User not found") {
            return ApiResponse.json({ items: [], pagination: { total: 0, limit: 1, page: 1, pages: 0 } });
          }
          throw err;
        }
      }
    }

    const where = buildUserWhereClause(filters);

    // Segurança: Filtro por Hierarquia e Escopo
    if (!isAdmin) {
      if (currentUser.companyId) {
        (where as any).companyId = currentUser.companyId;
      } else if (currentUser.projectId) {
        (where as any).projectId = currentUser.projectId;
      } else {
        where.id = currentUser.id;
      }
    } else {
      // Desenvolvedores ou Admins Reais filtram por hierarquia
      const isGod =
        isGodRole(currentUser.role || "") ||
        (currentUser as any).hierarchyLevel >= SECURITY_RANKS.MASTER;

      if (!isGod) {
        const myLevel = (currentUser as any).hierarchyLevel || SECURITY_RANKS.ADMIN;
        where.hierarchyLevel = { lte: myLevel };
      }
    }

    const total = await userRepository.count(where);
    const pages = Math.ceil(total / limit);

    // Streaming para limites altos (> 2000)
    if (limit > 2000) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(
              encoder.encode('{"success":true,"data":{"items":['),
            );

            let totalSent = 0;
            const batchSize = 500;
            const skipStart = (page - 1) * limit;
            const maxToFetch = Math.min(limit, total - skipStart);

            while (totalSent < maxToFetch) {
              const takeBatch = Math.min(batchSize, maxToFetch - totalSent);
              const users = await userRepository.findAll({
                where,
                skip: skipStart + totalSent,
                take: takeBatch,
                orderBy: sortBy
                  ? ({ [sortBy]: sortOrder || "asc" } as any)
                  : [{ hierarchyLevel: "desc" }, { name: "asc" }],
                select: publicUserSelect,
              });

              if (users.length === 0) break;

              const flattenedUsers = users.map((u) =>
                userService.flattenUser(u),
              );
              const usersJson = flattenedUsers
                .map((u) => JSON.stringify(u))
                .join(",");
              const prefix = totalSent > 0 ? "," : "";
              controller.enqueue(encoder.encode(prefix + usersJson));

              totalSent += users.length;
              if (maxToFetch > 5000)
                await new Promise((resolve) => setTimeout(resolve, 50));
            }

            const paginationJson = JSON.stringify({
              page,
              limit,
              total,
              pages,
              hasNext: page < pages,
              hasPrev: page > 1,
            });
            controller.enqueue(
              encoder.encode(
                `],"pagination":${paginationJson}},"timestamp":"${new Date().toISOString()}"}`,
              ),
            );
            controller.close();
          } catch (err) {
            logger.error("Erro no streaming de usuários", { err });
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/json",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // Caso normal
    const result = await userService.listUsers({
      params: {
        where,
        page,
        limit,
        sortBy,
        sortOrder,
        select: publicUserSelect,
      }
    });

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#GET");
  }
}

// ===== CREATE USER =====
export async function POST(request: NextRequest) {
  try {
    const currentUser = await authSession.requireAuth();
    if (!(await authSession.can("users.manage"))) {
      return ApiResponse.forbidden("Sem permissão para gerenciar usuários");
    }
    const body = await request.json();
    const validationResult = validate(createUserSchema, body);

    if (!validationResult.success) {
      return ApiResponse.validationError(validationResult.errors);
    }

    const user = await userService.createUser(
      validationResult.data,
      publicUserSelect,
      currentUser.id,
    );
    return ApiResponse.created(user, MESSAGES.SUCCESS.CREATED);
  } catch (error: any) {
    if (error.message === "Email already exists") {
      return ApiResponse.conflict(MESSAGES.USER.EMAIL_EXISTS);
    }
    return handleApiError(error, "src/app/api/v1/users/route.ts#POST");
  }
}

// ===== UPDATE USER =====
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const currentUser = await authSession.requireAuth();
    const targetUserId = body.id ?? currentUser.id;

    const isAdmin = authSession.isUserAdmin(
      currentUser.role,
      (currentUser as any).hierarchyLevel,
    );
    const canManage = await authSession.can("users.manage");
    const hasFullAccess = await authSession.can("system.full_access");

    if (!canManage && targetUserId !== currentUser.id) {
      return ApiResponse.forbidden("Você não pode atualizar outros usuários");
    }

    // Só bloqueia campos se o usuário **não tem full access e não é admin/god**

    if (!hasFullAccess && !isAdmin && !canManage) {
      delete body.role;
      delete body.companyId;
      delete body.projectId;
      delete body.status;
    }

    // Validação e Normalização dos dados (CPF, email, etc.)
    const updatePayload = { ...body };
    delete (updatePayload as any).id;

    // Normalização de Nome (Frontend Gestão Virtual usa fullName)
    if (updatePayload.fullName !== undefined && updatePayload.name === undefined) {
      updatePayload.name = updatePayload.fullName;
    }

    const validation = validate(updateUserSchema, updatePayload);
    if (!validation.success) {
      console.warn(`[UserUpdate] Validation failed for user ${targetUserId}:`, validation.errors);
      return ApiResponse.badRequest("Erro de validação", validation.errors);
    }

    const updatedUser = await userService.updateUser(
      targetUserId,
      validation.data, // Dados validados e normalizados
      publicUserSelect,
      currentUser.id,
    );
    return ApiResponse.json(updatedUser, MESSAGES.SUCCESS.UPDATED);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#PUT");
  }
}

// ===== DELETE USER =====
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await authSession.requireAuth();
    if (!(await authSession.can("users.manage"))) {
      return ApiResponse.forbidden("Sem permissão para excluir usuários");
    }
    const searchParams = request.nextUrl.searchParams;
    const idParam = searchParams.get("id");

    if (!idParam) {
      return ApiResponse.validationError(["ID parameter is required"]);
    }

    const ids = idParam.split(",").filter(Boolean);
    if (ids.length === 0) {
      return ApiResponse.validationError(["Invalid ID parameter"]);
    }

    const results = await Promise.allSettled(
      ids.map((id) => userService.deleteUser(id, currentUser.id)),
    );

    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason.message);

    if (errors.length === ids.length) {
      // All failed
      throw new Error(errors[0]);
    }

    if (errors.length > 0) {
      // Partial success
      return ApiResponse.json(
        {
          success: true,
          message: `Deleted ${ids.length - errors.length} users. ${errors.length} failed.`,
          errors,
        },
        "Partial Success",
      );
    }

    return ApiResponse.json({ success: true }, MESSAGES.SUCCESS.DELETED);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#DELETE");
  }
}
