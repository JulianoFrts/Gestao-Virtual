import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import {
  createUserSchema,
  updateUserSchema,
  validate,
} from "@/lib/utils/validators/schemas";
import * as authSession from "@/lib/auth/session";
import { invalidateSessionCache } from "@/lib/auth/session";
import { publicUserSelect, buildUserWhereClause } from "@/types/database";
import { CONSTANTS } from "@/lib/constants";
import { UserService } from "@/modules/users/application/user.service";
import { CreateUserDTO, UpdateUserDTO } from "@/modules/users/domain/user.dto";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";

import {
  parsePagination,
  parseFilters,
  handleSingleUserFetch,
  applyHierarchySecurity,
  prepareUpdatePayload,
} from "./utils";
import { generateUsersStream } from "./stream";
import { UserFilters } from "@/types/database";

// DI (Manual)
const userRepository = new PrismaUserRepository();
const systemAuditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, systemAuditRepository);

// ===== HEAD (Health Check) =====
export async function HEAD(): Promise<Response> {
  return ApiResponse.noContent();
}

// ===== GET USERS =====
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const currentUser = await authSession.requireAuth();
    const isAdmin = authSession.isUserAdmin(
      currentUser.role,
      currentUser.hierarchyLevel,
      currentUser.permissions as Record<string, boolean>,
    );

    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePagination(searchParams);
    if ("errors" in pagination) return ApiResponse.validationError(pagination.errors as string[]);

    const filters = parseFilters(searchParams) as UserFilters & { errors?: string[] };
    if (filters.errors) return ApiResponse.validationError(filters.errors);

    // 2. Lógica de Perfil Único (Short-circuit)
    if (filters.id && !filters.search) {
      const singleUserResponse = await handleSingleUserFetch(filters.id, currentUser, isAdmin, userService);
      if (singleUserResponse) return singleUserResponse;
    }

    // 3. Construção do Where e Segurança
    const where = buildUserWhereClause(filters);
    applyHierarchySecurity(where, currentUser, isAdmin);

    // 4. Execução e Resposta
    return await executeUserList(where, pagination as unknown, userRepository, userService);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#GET");
  }
}

async function executeUserList(
  where: Record<string, any>,
  pagination: { page: number; limit: number; sortBy?: string; sortOrder?: "asc" | "desc" },
  repository: PrismaUserRepository,
  service: UserService,
): Promise<Response> {
  const { page, limit, sortBy, sortOrder } = pagination;

  if (limit > CONSTANTS.API.STREAM.THRESHOLD) {
    const total = await repository.count(where);
    const stream = generateUsersStream({
      where,
      page,
      limit,
      total,
      sortBy,
      sortOrder,
      CONSTANTS,
      userRepository: repository,
      userService: service,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  const result = await service.listUsers({
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
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requireAuth();
    if (!(await authSession.can("users.manage"))) {
      return ApiResponse.forbidden("Sem permissão para gerenciar usuários");
    }
    const body = await request.json();
    const validationResult = validate(createUserSchema, body);

    if (!validationResult.success) {
      return ApiResponse.validationError(validationResult.errors);
    }

    const createdUser = await userService.createUser(
      validationResult.data as CreateUserDTO,
      publicUserSelect,
      user.id,
    );
    return ApiResponse.created(user, CONSTANTS.HTTP.MESSAGES.SUCCESS.CREATED);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "Email already exists") {
      return ApiResponse.conflict(CONSTANTS.HTTP.MESSAGES.ERROR.CONFLICT);
    }
    return handleApiError(error, "src/app/api/v1/users/route.ts#POST");
  }
}

// ===== UPDATE USER =====
export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const currentUser = await authSession.requireAuth();

    const isAdmin = authSession.isUserAdmin(
      currentUser.role,
      currentUser.hierarchyLevel,
      currentUser.permissions as Record<string, boolean>,
    );
    const canManage = await authSession.can("users.manage");
    const hasFullAccess = await authSession.can("system.full_access");

    const targetUserId = body.id ?? currentUser.id;

    if (!canManage && targetUserId !== currentUser.id) {
      return ApiResponse.forbidden("Você não pode atualizar outros usuários");
    }

    // Validação e Normalização
    const payload = prepareUpdatePayload(body as Record<string, unknown>, {
      isAdmin,
      canManage,
      hasFullAccess,
    });
    const validation = validate(updateUserSchema, payload);

    if (!validation.success) {
      console.warn(
        `[UserUpdate] Validation failed:`,
        JSON.stringify({ payload, errors: validation.errors }, null, 2),
      );
      return ApiResponse.badRequest("Erro de validação", validation.errors);
    }

    const updatedUser = await userService.updateUser(
      targetUserId,
      validation.data as UpdateUserDTO,
      publicUserSelect,
      currentUser.id,
    );

    await invalidateSessionCache();
    return ApiResponse.json(
      updatedUser,
      CONSTANTS.HTTP.MESSAGES.SUCCESS.UPDATED,
    );
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#PUT");
  }
}

// ===== DELETE USER =====
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requireAuth();
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
      ids.map((id) => userService.deleteUser(id, user.id)),
    );

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason.message);

    if (errors.length === ids.length) {
      // All failed
      throw new Error(errors[0]);
    }

    if (errors.length > 0) {
      // Partial success
      return ApiResponse.json(
        {
          success: true,
          message: `Removed ${ids.length - errors.length} users. ${errors.length} failed.`,
          errors,
        },
        "Partial Success",
      );
    }

    return ApiResponse.json(
      { success: true },
      CONSTANTS.HTTP.MESSAGES.SUCCESS.DELETED,
    );
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#DELETE");
  }
}

// ===== BULK UPDATE USERS =====
export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const session = await authSession.requireAuth();
    if (!(await authSession.can("users.manage"))) {
      return ApiResponse.forbidden("Sem permissão para gerenciar usuários");
    }

    const body = await request.json();
    const { ids, data } = body as { ids: string[]; data: Record<string, unknown> };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.validationError([
        "A list of user IDs is required for bulk update",
      ]);
    }

    if (!data || Object.keys(data).length === 0) {
      return ApiResponse.validationError(["Update data is required"]);
    }

    const currentUser = await authSession.requireAuth();
    const isAdmin = authSession.isUserAdmin(
      currentUser.role,
      currentUser.hierarchyLevel,
      currentUser.permissions as Record<string, boolean>,
    );
    const canManage = await authSession.can("users.manage");
    const hasFullAccess = await authSession.can("system.full_access");

    // Validação comum de payload para garantir que não estão alterando campos proibidos
    const payload = prepareUpdatePayload(data, {
      isAdmin,
      canManage,
      hasFullAccess,
    });

    // Nota: O Service.bulkUpdateUsers agora usa transação otimizada
    const result = await userService.bulkUpdateUsers(
      ids,
      payload as UpdateUserDTO,
      currentUser.id,
    );

    return ApiResponse.json(result, CONSTANTS.HTTP.MESSAGES.SUCCESS.UPDATED);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/users/route.ts#PATCH");
  }
}

