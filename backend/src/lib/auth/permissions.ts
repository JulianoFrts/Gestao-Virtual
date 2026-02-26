import { type Session } from "next-auth";
import { type NextRequest } from "next/server";
import type { Role } from "@/types/database";
import { getCurrentSession } from "./core";
import { isUserAdmin, isGlobalAdmin } from "./utils";
import { HTTP_STATUS } from "@/lib/constants";

/**
 * Obtém o usuário atual ou lança erro
 */
export async function requireAuth(req?: NextRequest): Promise<Session["user"]> {
  const session = await getCurrentSession(req);
  if (!session?.user) {
    const error = new Error("Não autenticado");
    (error as unknown).status = HTTP_STATUS.UNAUTHORIZED;
    throw error;
  }
  return session.user;
}

/**
 * Exige uma permissão específica
 */
export async function requirePermission(
  permission: string,
  req?: NextRequest,
): Promise<Session["user"]> {
  const user = await requireAuth(req);
  const hasPermission = await can(permission);

  if (!hasPermission) {
    const error = new Error(`Permissão negada: ${permission}`);
    (error as unknown).status = HTTP_STATUS.FORBIDDEN;
    throw error;
  }

  return user;
}

/**
 * Exige validação de escopo (Tenant Isolation)
 * Verifica se o usuário pertence à empresa ou projeto solicitado
 */
export async function requireScope(
  targetId: string,
  type: "COMPANY" | "PROJECT" | "USER" = "COMPANY",
  req?: NextRequest,
): Promise<Session["user"]> {
  const user = await requireAuth(req);
  const { role, companyId, id: userId } = user as unknown;
  const permissions = (user.permissions as Record<string, boolean>) || {};

  // Apenas Administradores Globais (rank 1000+) ignoram travas de escopo.
  // Administradores de Empresa (rank 900) DEVEM ser validados pelo companyId.
  if (isGlobalAdmin(role, user.hierarchyLevel || 0, permissions)) {
    return user;
  }

  let isAllowed = false;

  if (type === "COMPANY") {
    isAllowed = companyId === targetId;
  } else if (type === "USER") {
    isAllowed = userId === targetId;
  }

  if (!isAllowed) {
    const error = new Error("Acesso restrito: Violação de escopo de dados");
    (error as unknown).status = HTTP_STATUS.FORBIDDEN;
    throw error;
  }

  return user;
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export async function can(permission: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  const { role, hierarchyLevel } = session.user as unknown;
  const permissions = (session.user.permissions as Record<string, boolean>) || {};

  if (isUserAdmin(role, hierarchyLevel || 0, permissions)) return true;

  return !!permissions[permission] || !!permissions["system.full_access"];
}

/**
 * Verifica se uma flag de UI deve ser exibida
 */
export async function show(flag: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  const ui = (session.user as unknown).ui || {};
  if (Object.keys(ui).length === 0) {
    const permissions = (session.user.permissions as Record<string, boolean>) || {};
    return isUserAdmin(
      session.user.role as unknown,
      session.user.hierarchyLevel || 0,
      permissions,
    );
  }

  return !!ui[flag];
}

/**
 * Exige um cargo específico
 */
export async function requireRole(
  requiredRole: Role,
  req?: NextRequest,
): Promise<Session["user"]> {
  const user = await requireAuth(req);
  const permissions = (user.permissions as Record<string, boolean>) || {};
  if (
    user.role !== requiredRole &&
    !isUserAdmin(user.role, user.hierarchyLevel, permissions)
  ) {
    throw new Error("Sem permissão");
  }
  return user;
}

/**
 * Exige um dos cargos permitidos
 */
export async function requireRoles(
  allowedRoles: Role[],
  req?: NextRequest,
): Promise<Session["user"]> {
  const user = await requireAuth(req);
  const permissions = (user.permissions as Record<string, boolean>) || {};
  if (
    !allowedRoles.includes(user.role as unknown) &&
    !isUserAdmin(user.role, user.hierarchyLevel, permissions)
  ) {
    throw new Error("Sem permissão");
  }
  return user;
}

/**
 * Exige acesso de administrador
 */
export async function requireAdmin(
  req?: NextRequest,
): Promise<Session["user"]> {
  const user = await requireAuth(req);
  const permissions = (user.permissions as Record<string, boolean>) || {};
  if (!isUserAdmin(user.role, user.hierarchyLevel, permissions))
    throw new Error("Acesso restrito admin");
  return user;
}

/**
 * Exige ser o dono do recurso ou administrador
 */
export async function requireOwnerOrAdmin(
  resourceOwnerId: string,
  req?: NextRequest,
): Promise<Session["user"]> {
  const user = await requireAuth(req);
  const permissions = (user.permissions as Record<string, boolean>) || {};
  if (
    user.id !== resourceOwnerId &&
    !isGlobalAdmin(user.role, user.hierarchyLevel, permissions)
  ) {
    throw new Error("Sem permissão recurso");
  }
  return user;
}

/**
 * Exige uma conta ativa
 */
export async function requireActiveAccount(
  req?: NextRequest,
): Promise<Session["user"]> {
  const user = await requireAuth(req);
  if (user.status !== "ACTIVE") throw new Error("Conta inativa");
  return user;
}

export interface PermissionCheckResult {
  allowed: boolean;
  user: Session["user"] | null;
  reason?: string;
}

/**
 * Realiza uma verificação de permissão completa e retorna um resultado estruturado
 */
export async function checkPermission(
  requiredRoles: Role[] = [],
): Promise<PermissionCheckResult> {
  const session = await getCurrentSession();
  if (!session?.user)
    return { allowed: false, user: null, reason: "Não autenticado" };

  const { role } = session.user;
  const hierarchyLevel = session.user.hierarchyLevel;
  const permissions = (session.user.permissions as Record<string, boolean>) || {};

  if (requiredRoles.length > 0) {
    const hasRole =
      requiredRoles.includes(role as unknown) ||
      isUserAdmin(role, hierarchyLevel, permissions);
    if (!hasRole)
      return {
        allowed: false,
        user: session.user,
        reason: "Sem permissão suficiente",
      };
  }

  if (session.user.status !== "ACTIVE")
    return { allowed: false, user: session.user, reason: "Conta inativa" };

  return { allowed: true, user: session.user };
}
