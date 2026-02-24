import { type Session } from "next-auth";
import { type NextRequest } from "next/server";
import type { Role } from "@/types/database";
import { getCurrentSession } from "./core";
import { isUserAdmin } from "./utils";

/**
 * Obtém o usuário atual ou lança erro
 */
export async function requireAuth(req?: NextRequest): Promise<Session["user"]> {
  const session = await getCurrentSession(req);
  if (!session?.user) throw new Error("Não autenticado");
  return session.user;
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export async function can(permission: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  const { role, hierarchyLevel } = session.user as any;
  const permissions = (session.user as any).permissions || {};

  if (isUserAdmin(role, hierarchyLevel, permissions)) return true;

  return !!permissions[permission] || !!permissions["system.full_access"];
}

/**
 * Verifica se uma flag de UI deve ser exibida
 */
export async function show(flag: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  const ui = (session.user as any).ui || {};
  if (Object.keys(ui).length === 0) {
    const permissions = (session.user as any).permissions || {};
    return isUserAdmin(
      session.user.role,
      (session.user as any).hierarchyLevel,
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
  const permissions = (user as any).permissions || {};
  if (
    user.role !== requiredRole &&
    !isUserAdmin(user.role, (user as any).hierarchyLevel, permissions)
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
  const permissions = (user as any).permissions || {};
  if (
    !allowedRoles.includes(user.role as any) &&
    !isUserAdmin(user.role, (user as any).hierarchyLevel, permissions)
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
  const permissions = (user as any).permissions || {};
  if (!isUserAdmin(user.role, (user as any).hierarchyLevel, permissions))
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
  const permissions = (user as any).permissions || {};
  if (
    user.id !== resourceOwnerId &&
    !isUserAdmin(user.role, (user as any).hierarchyLevel, permissions)
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
  const hierarchyLevel = (session.user as any).hierarchyLevel;
  const permissions = (session.user as any).permissions || {};

  if (requiredRoles.length > 0) {
    const hasRole =
      requiredRoles.includes(role as any) ||
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
