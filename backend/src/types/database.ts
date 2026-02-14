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
 * Seleção de campos públicos do usuário
 */
export const publicUserSelect = {
  id: true,
  name: true,
  image: true,
  hierarchyLevel: true,
  registrationNumber: true,
  cpf: true,
  phone: true,
  functionId: true,
  laborType: true,
  iapName: true,
  gender: true,
  birthDate: true,
  address: {
    select: {
      cep: true,
      street: true,
      number: true,
      neighborhood: true,
      city: true,
      stateCode: true,
      stateName: true,
    }
  },
  createdAt: true,
  updatedAt: true,
  authCredential: {
    select: {
      email: true,
      role: true,
      status: true,
      mfaEnabled: true,
      mfaSecret: true,
    },
  },
  affiliation: {
    select: {
      companyId: true,
      projectId: true,
      siteId: true,
    },
  },
  ...({ isSystemAdmin: true } as any),
  jobFunction: {
    select: {
      id: true,
      name: true,
      canLeadTeam: true,
      hierarchyLevel: true,
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
}

/**
 * Converte filtros para where do Prisma
 */
export function buildUserWhereClause(
  filters: UserFilters,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (filters.id) {
    where.id = filters.id;
  }

  if (
    filters.search &&
    typeof filters.search === "string" &&
    filters.search.trim() !== ""
  ) {
    where.OR = [
      {
        authCredential: {
          email: { contains: filters.search, mode: "insensitive" },
        },
      },
      { name: { contains: filters.search, mode: "insensitive" } },
      { registrationNumber: { contains: filters.search, mode: "insensitive" } },
      { cpf: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.role && (filters.role as string) !== "") {
    where.authCredential = {
      ...(where.authCredential as any),
      role: filters.role as Role,
    };
  }

  if (filters.status && (filters.status as string) !== "") {
    where.authCredential = {
      ...(where.authCredential as any),
      status: filters.status as AccountStatus,
    };
  }

  if (filters.emailVerified !== undefined && filters.emailVerified !== null) {
    where.authCredential = {
      ...(where.authCredential as any),
      emailVerified: filters.emailVerified ? { not: null } : null,
    };
  }

  const corporateRoles: Role[] = [
    "SUPER_ADMIN_GOD",
    "SOCIO_DIRETOR",
    "ADMIN",
    "TI_SOFTWARE",
    "HELPER_SYSTEM",
  ];

  // Only apply role restrictions if NOT searching (Search is global)
  if (!filters.search || filters.search.trim() === "") {
    if (filters.onlyCorporate) {
      where.authCredential = {
        ...(where.authCredential as any),
        role: { in: corporateRoles },
      };
    } else if (filters.excludeCorporate) {
      where.authCredential = {
        ...(where.authCredential as any),
        role: { notIn: corporateRoles },
      };
    }
  }

  if (filters.createdAfter || filters.createdBefore) {
    const createdAt: Prisma.DateTimeFilter = {};
    let hasFilter = false;

    if (filters.createdAfter) {
      createdAt.gte = filters.createdAfter;
      hasFilter = true;
    }
    if (filters.createdBefore) {
      createdAt.lte = filters.createdBefore;
      hasFilter = true;
    }

    if (hasFilter) {
      where.createdAt = createdAt;
    }
  }

  if (filters.projectId) {
    where.affiliation = {
      ...(where.affiliation as any),
      projectId: filters.projectId,
    };
  }

  if (filters.siteId) {
    where.affiliation = {
      ...(where.affiliation as any),
      siteId: filters.siteId,
    };
  }

  if (filters.companyId) {
    where.affiliation = {
      ...(where.affiliation as any),
      companyId: filters.companyId,
    };
  }

  return where;
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
