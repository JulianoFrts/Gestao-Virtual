/**
 * Types de Database - GESTÃO VIRTUAL Backend
 *
 * Types derivados e auxiliares para operações com Prisma
 */

import { Role, AccountStatus } from "@prisma/client";
import type {
  Prisma,
  User,
  Session,
  Account,
  AuditLog,
  VerificationToken,
} from "@prisma/client";

export { Role, AccountStatus };
export type { User, Session, Account, AuditLog, VerificationToken };

// =============================================
// TIPOS DE SELEÇÃO
// =============================================

/**
 * Seleção de campos públicos do usuário (Tripartição de Responsabilidades)
 */
export const publicUserSelect = {
  // PILAR PESSOAL
  id: true,
  name: true,
  image: true,
  cpf: true,
  phone: true,
  gender: true,
  birthDate: true,
  createdAt: true,
  updatedAt: true,
  address: {
    select: {
      cep: true,
      logradouro: true,
      number: true,
      bairro: true,
      localidade: true,
      uf: true,
      estado: true,
    },
  },

  // PILAR DE SEGURANÇA
  authCredential: {
    select: {
      email: true,
      role: true,
      status: true,
      mfaEnabled: true,
      isSystemAdmin: true,
      permissions: true,
    },
  },

  // PILAR DE OBRA / OPERACIONAL
  affiliation: {
    select: {
      companyId: true,
      projectId: true,
      siteId: true,
      registrationNumber: true,
      hierarchyLevel: true,
      laborType: true,
      iapName: true,
      functionId: true,
      jobFunction: {
        select: {
          id: true,
          name: true,
          category: true,
          canLeadTeam: true,
        },
      },
    },
  },
} as const satisfies Prisma.UserSelect;

/**
 * Tipo derivado da seleção pública
 */
export type PublicUserFromDB = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

// =============================================
// TIPOS DE FILTRO
// =============================================

/**
 * Filtros para busca de usuários
 */
export interface UserFilters {
  id?: string | null;
  search?: string | null;
  role?: string | null;
  status?: string | null;
  emailVerified?: boolean | null;
  createdAfter?: Date | null;
  createdBefore?: Date | null;
  projectId?: string | null;
  siteId?: string | null;
  companyId?: string | null;
  onlyCorporate?: boolean;
  excludeCorporate?: boolean;
  or?: string | null;
}

/**
 * Converte filtros para where do Prisma
 */
export function buildUserWhereClause(
  filters: UserFilters,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (filters.id) where.id = filters.id;

  // 1. Filtro de Busca (Texto Global)
  Object.assign(where, buildSearchFilter(filters.search));

  // 2. Filtros de Conta (Role, Status, Verificação)
  Object.assign(where, buildAccountFilters(filters));

  // 3. Filtros Temporais
  Object.assign(
    where,
    buildDateFilter(filters.createdAfter, filters.createdBefore),
  );

  // 4. Filtros de Afiliação (Empresa, Projeto, Canteiro)
  Object.assign(where, buildAffiliationFilter(filters));

  // 5. Filtro OR Manual (PostgREST style: col.eq.val,col.is.null)
  if (filters.or) {
    const orConditions = filters.or
      .split(",")
      .map((cond) => {
        const [col, op, val] = cond.split(".");
        if (op === "eq") {
          if (["projectId", "siteId", "companyId"].includes(col)) {
            return { affiliation: { [col]: val } };
          }
          return { [col]: val };
        }
        if (op === "is" && val === "null") {
          if (["projectId", "siteId", "companyId"].includes(col)) {
            // This covers users with affiliation record but null project/site
            // To also cover users without any affiliation record, we'd need more complex OR
            return {
              OR: [{ affiliation: { [col]: null } }, { affiliation: null }],
            };
          }
          return { [col]: null };
        }
        return null;
      })
      .filter(Boolean);

    if (orConditions.length > 0) {
      where.OR = ((where.OR as any[]) || []).concat(orConditions);
    }
  }

  return where;
}

/**
 * Auxiliares de Construção de Filtros
 */

function buildSearchFilter(search?: string | null): Prisma.UserWhereInput {
  if (!search || search.trim() === "") return {};

  return {
    OR: [
      { authCredential: { email: { contains: search, mode: "insensitive" } } },
      { name: { contains: search, mode: "insensitive" } },
      { affiliation: { registrationNumber: { contains: search, mode: "insensitive" } } },
      { cpf: { contains: search, mode: "insensitive" } },
    ],
  };
}

function buildAccountFilters(filters: UserFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  const authWhere: any = {};

  if (filters.role && (filters.role as string) !== "") {
    const roles = (filters.role as string).split(",").map((r) => r.trim());
    authWhere.role =
      roles.length > 1 ? { in: roles as Role[] } : (roles[0] as Role);
  }

  if (filters.status && (filters.status as string) !== "") {
    authWhere.status = filters.status as AccountStatus;
  }

  if (filters.emailVerified !== undefined && filters.emailVerified !== null) {
    authWhere.emailVerified = filters.emailVerified ? { not: null } : null;
  }

  // Regras de Corporate (apenas se não houver busca ativa)
  if (!filters.search || filters.search.trim() === "") {
    const corporateRoles: Role[] = [
      "SUPER_ADMIN_GOD",
      "SOCIO_DIRETOR",
      "ADMIN",
      "TI_SOFTWARE",
      "HELPER_SYSTEM",
    ];
    if (filters.onlyCorporate) {
      authWhere.role = { in: corporateRoles };
    } else if (filters.excludeCorporate) {
      authWhere.role = { notIn: corporateRoles };
    }
  }

  if (Object.keys(authWhere).length > 0) {
    where.authCredential = authWhere;
  }

  return where;
}

function buildDateFilter(
  after?: Date | null,
  before?: Date | null,
): Prisma.UserWhereInput {
  if (!after && !before) return {};

  const createdAt: Prisma.DateTimeFilter = {};
  if (after) createdAt.gte = after;
  if (before) createdAt.lte = before;

  return { createdAt };
}

function buildAffiliationFilter(filters: UserFilters): Prisma.UserWhereInput {
  const affWhere: any = {};
  if (filters.projectId) affWhere.projectId = filters.projectId;
  if (filters.siteId) affWhere.siteId = filters.siteId;
  if (filters.companyId) affWhere.companyId = filters.companyId;

  if (Object.keys(affWhere).length > 0) {
    return { affiliation: affWhere };
  }
  return {};
}

// =============================================
// TIPOS DE AUDITORIA
// =============================================

/**
 * Ações de auditoria padronizadas
 */
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET"
  | "EMAIL_VERIFY"
  | "ROLE_CHANGE"
  | "STATUS_CHANGE";

/**
 * Dados para criar log de auditoria
 */
export interface CreateAuditLogInput {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================
// TIPOS DE TRANSAÇÃO
// =============================================

/**
 * Tipo para transações Prisma
 */
export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// Force TS refresh
