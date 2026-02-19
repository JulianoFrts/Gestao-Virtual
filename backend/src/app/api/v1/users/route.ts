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
import { invalidateSessionCache } from "@/lib/auth/session";
import { publicUserSelect, buildUserWhereClause } from "@/types/database";
import { logger } from "@/lib/utils/logger";
import { CONSTANTS } from "@/lib/constants";
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

    // 1. Validação de Parâmetros
    const pagination = parsePagination(searchParams);
    if ('errors' in pagination) return ApiResponse.validationError(pagination.errors);

    const filters = parseFilters(searchParams);
    if ('errors' in filters) return ApiResponse.validationError(filters.errors);

    // 2. Lógica de Perfil Único (Short-circuit)
    if (filters.id && !filters.search) {
      const singleUserResponse = await handleSingleUserFetch(filters.id, currentUser, isAdmin);
      if (singleUserResponse) return singleUserResponse;
    }

    // 3. Construção do Where e Segurança
    const where = buildUserWhereClause(filters);
    applyHierarchySecurity(where, currentUser, isAdmin);

    const { page, limit, sortBy, sortOrder } = pagination as { page: number; limit: number; sortBy?: string; sortOrder?: string };

    // 4. Resposta (Streaming ou Normal)
    return handleUsersResponse(where, pagination, CONSTANTS);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#GET");
  }
}

interface UserStreamParams {
  where: any;
  page: number;
  limit: number;
  total: number;
  sortBy?: string;
  sortOrder?: string;
  CONSTANTS: any;
}

async function handleUsersResponse(where: any, pagination: any, CONSTANTS: any) {
  const { page, limit, sortBy, sortOrder } = pagination;

  if (limit > CONSTANTS.API.STREAM.THRESHOLD) {
    const total = await userRepository.count(where);
    const stream = generateUsersStream({
      where,
      page,
      limit,
      total,
      sortBy,
      sortOrder,
      CONSTANTS
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/json", "Transfer-Encoding": "chunked" },
    });
  }

  const result = await userService.listUsers({
    where,
    page,
    limit,
    sortBy,
    sortOrder,
    select: publicUserSelect,
  });

  return ApiResponse.json(result);
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
    return ApiResponse.created(user, CONSTANTS.HTTP.MESSAGES.SUCCESS.CREATED);
  } catch (error: any) {
    if (error.message === "Email already exists") {
      return ApiResponse.conflict(CONSTANTS.HTTP.MESSAGES.ERROR.CONFLICT);
    }
    return handleApiError(error, "src/app/api/v1/users/route.ts#POST");
  }
}

// ===== UPDATE USER =====
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const currentUser = await authSession.requireAuth();

    const isAdmin = authSession.isUserAdmin(currentUser.role, (currentUser as any).hierarchyLevel);
    const canManage = await authSession.can("users.manage");
    const hasFullAccess = await authSession.can("system.full_access");

    const targetUserId = body.id ?? currentUser.id;

    if (!canManage && targetUserId !== currentUser.id) {
      return ApiResponse.forbidden("Você não pode atualizar outros usuários");
    }

    // Validação e Normalização
    const payload = prepareUpdatePayload(body, { isAdmin, canManage, hasFullAccess });
    const validation = validate(updateUserSchema, payload);

    if (!validation.success) {
      console.warn(`[UserUpdate] Validation failed for user ${targetUserId}:`, validation.errors);
      return ApiResponse.badRequest("Erro de validação", validation.errors);
    }

    const updatedUser = await userService.updateUser(
      targetUserId,
      validation.data,
      publicUserSelect,
      currentUser.id
    );

    await invalidateSessionCache(targetUserId);
    return ApiResponse.json(updatedUser, CONSTANTS.HTTP.MESSAGES.SUCCESS.UPDATED);
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

    return ApiResponse.json({ success: true }, CONSTANTS.HTTP.MESSAGES.SUCCESS.DELETED);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#DELETE");
  }
}

/**
 * Função Auxiliar para Streaming de Usuários (SRP)
 */
function generateUsersStream(params: UserStreamParams): ReadableStream {
  const { where, page, limit, total, sortBy, sortOrder, CONSTANTS } = params;
  const encoder = new TextEncoder();
  const pages = Math.ceil(total / limit);

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode('{"success":true,"data":{"items":['),
        );

        let totalSent = 0;
        const batchSize = CONSTANTS.API.BATCH.SIZE;
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
          if (maxToFetch > CONSTANTS.API.THROTTLE.THRESHOLD)
            await new Promise((resolve) => setTimeout(resolve, CONSTANTS.API.THROTTLE.MS));
        }

        const paginationJson = JSON.stringify({
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > CONSTANTS.API.PAGINATION.DEFAULT_PAGE,
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
}

// ==========================================
// HELPERS DE REFATORAÇÃO (Fase 2)
// ==========================================

function parsePagination(searchParams: URLSearchParams): { page: number; limit: number; sortBy?: string; sortOrder?: string } | { errors: string[] } {
  const result = validate(paginationSchema, {
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    sortBy: searchParams.get("sortBy"),
    sortOrder: searchParams.get("sortOrder"),
  });

  if (!result.success) return { errors: result.errors };

  const data = result.data as any;
  return {
    page: data.page || CONSTANTS.API.PAGINATION.DEFAULT_PAGE,
    limit: data.limit || CONSTANTS.API.PAGINATION.DEFAULT_LIMIT,
    sortBy: data.sortBy,
    sortOrder: data.sortOrder,
  };
}

function parseFilters(searchParams: URLSearchParams): any | { errors: string[] } {
  const result = validate(userFiltersSchema, {
    id: searchParams.get("id"),
    search: searchParams.get("search"),
    role: searchParams.get("role"),
    status: searchParams.get("status"),
    emailVerified: searchParams.get("emailVerified"),
    createdAfter: searchParams.get("createdAfter"),
    createdBefore: searchParams.get("createdBefore"),
    projectId: searchParams.get("projectId") || searchParams.get("project_id"),
    siteId: searchParams.get("siteId") || searchParams.get("site_id"),
    companyId: searchParams.get("companyId") || searchParams.get("company_id"),
    onlyCorporate: searchParams.get("onlyCorporate"),
    excludeCorporate: searchParams.get("excludeCorporate"),
  });

  if (!result.success) return { errors: result.errors };
  return result.data;
}

async function handleSingleUserFetch(id: string, currentUser: any, isAdmin: boolean) {
  if (isAdmin || id === currentUser.id) {
    try {
      const profile = await userService.getProfile(id);
      return ApiResponse.json({
        items: [profile],
        pagination: {
          page: CONSTANTS.API.PAGINATION.DEFAULT_PAGE,
          limit: 1,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    } catch (err: any) {
      if (err.message === "User not found") {
        return ApiResponse.json({
          items: [],
          pagination: {
            total: 0,
            limit: 1,
            page: CONSTANTS.API.PAGINATION.DEFAULT_PAGE,
            pages: 0,
          },
        });
      }
      throw err;
    }
  }
  return null;
}

function applyHierarchySecurity(where: any, currentUser: any, isAdmin: boolean) {
  if (!isAdmin) {
    if (currentUser.companyId) {
      where.affiliation = { companyId: currentUser.companyId };
    } else if (currentUser.projectId) {
      where.affiliation = { projectId: currentUser.projectId };
    } else {
      where.id = currentUser.id;
    }
  } else {
    const isGod =
      isGodRole(currentUser.role || "") ||
      (currentUser as any).hierarchyLevel >= SECURITY_RANKS.MASTER;

    if (!isGod) {
      const myLevel = (currentUser as any).hierarchyLevel || SECURITY_RANKS.ADMIN;
      where.hierarchyLevel = { lte: myLevel };
    }
  }
}

function prepareUpdatePayload(body: any, permissions: { isAdmin: boolean; canManage: boolean; hasFullAccess: boolean }) {
  const payload = { ...body };
  delete payload.id;

  // Segurança de Campos
  if (!permissions.hasFullAccess && !permissions.isAdmin && !permissions.canManage) {
    delete payload.role;
    delete payload.companyId;
    delete payload.projectId;
    delete payload.status;
  }

  // Normalização de Nome
  if (payload.fullName !== undefined && payload.name === undefined) {
    payload.name = payload.fullName;
  }

  return payload;
}
