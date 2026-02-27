import { validate } from "@/lib/utils/validators/schemas";
import {
  paginationSchema,
  userFiltersSchema,
} from "@/lib/utils/validators/schemas";
import { CONSTANTS } from "@/lib/constants";
import { isGlobalAdmin } from "@/lib/auth/utils";
import { SECURITY_RANKS } from "@/lib/constants/security";
import { ApiResponse } from "@/lib/utils/api/response";
import { UserService } from "@/modules/users/application/user.service";
import { Prisma } from "@prisma/client";
import { Session } from "@/types/auth";

/**
 * Parsea e valida parâmetros de paginação da URL
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
} | { errors: string[] } {
  const result = validate(paginationSchema, {
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    sortBy: searchParams.get("sortBy"),
    sortOrder: searchParams.get("sortOrder"),
  });

  if (!result.success) return { errors: result.errors };

  const data = result.data as {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
  return {
    page: data.page || CONSTANTS.API.PAGINATION.DEFAULT_PAGE,
    limit: data.limit || CONSTANTS.API.PAGINATION.DEFAULT_LIMIT,
    sortBy: data.sortBy,
    sortOrder: data.sortOrder,
  };
}

/**
 * Parsea e valida filtros da URL
 */
export function parseFilters(searchParams: URLSearchParams): any {
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
    or: searchParams.get("or"),
  });

  if (!result.success) return { errors: result.errors };
  return result.data;
}

/**
 * Busca perfil de usuário único (Self or Admin access)
 */
export async function handleSingleUserFetch(
  id: string,
  currentUser: unknown,
  isAdmin: boolean,
  userService: UserService,
): Promise<Response | null> {
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
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message === "User not found") {
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

/**
 * Aplica restrições de hierarquia e segurança na cláusula WHERE
 * Segue a hierarquia: Empresa > Obra (Projeto) > Canteiro (Site)
 */
export function applyHierarchySecurity(
  where: Prisma.UserWhereInput,
  currentUser: unknown,
  isAdmin: boolean,
): void {
  // 1. Verificamos se o usuário é Global (pode ver tudo de todas as empresas)
  const isGlobal = isGlobalAdmin(
    currentUser.role,
    currentUser.hierarchyLevel,
    currentUser.permissions as Record<string, boolean>,
  );

  // 2. Se não for Global, forçamos o isolamento progressivo
  if (!isGlobal) {
    const affiliation: Prisma.UserAffiliationWhereInput = {};

    // Isolamento por Empresa (Base)
    if (currentUser.companyId) {
      affiliation.companyId = currentUser.companyId;
    }

    // Isolamento por Projeto (Obra)
    if (currentUser.projectId) {
      affiliation.projectId = currentUser.projectId;
    }

    // Isolamento por Canteiro (Opcional)
    // Se o usuário tiver um siteId ativo na sessão, restringimos a este canteiro.
    // Se for nulo, ele tem visão geral do Projeto/Empresa.
    if (currentUser.siteId) {
      affiliation.siteId = currentUser.siteId;
    }

    // Se houver qualquer critério de afiliação, aplicamos ao WHERE
    if (Object.keys(affiliation).length > 0) {
      where.affiliation = affiliation;
    } else if (!isAdmin) {
      // Segurança extra: Usuário comum sem vínculos só vê a si mesmo
      where.id = currentUser.id;
    }
  }

  // 3. Restrição de Ranks (Admins não vêem quem está acima deles na hierarquia)
  if (isAdmin && !isGlobal) {
    const myLevel = currentUser.hierarchyLevel || SECURITY_RANKS.ADMIN;
    where.affiliation = {
        ...((where.affiliation as unknown) || {}),
        hierarchyLevel: { lte: myLevel }
    };
  }
}

/**
 * Prepara o payload de atualização removendo campos protegidos
 */
export function prepareUpdatePayload(
  body: Record<string, unknown>,
  permissions: { isAdmin: boolean; canManage: boolean; hasFullAccess: boolean },
): Record<string, unknown> {
  const payload = { ...body };
  delete payload.id;

  // Segurança de Campos: Somente God/SystemAdmin pode conceder isSystemAdmin
  if (!permissions.hasFullAccess) {
    delete payload.isSystemAdmin;
  }

  if (
    !permissions.hasFullAccess &&
    !permissions.isAdmin &&
    !permissions.canManage
  ) {
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
