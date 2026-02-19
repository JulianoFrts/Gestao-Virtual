import { type Session } from "next-auth";
import type { Role } from "@/types/database";
import { isGodRole, isSystemOwner, SECURITY_RANKS } from "@/lib/constants/security";
import { getCurrentSession } from "./core";
import { isUserAdmin } from "./utils";

/**
 * Obtém o usuário atual ou lança erro
 */
export async function requireAuth(): Promise<Session["user"]> {
  const session = await getCurrentSession();
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
  if (isGodRole(role) || hierarchyLevel >= SECURITY_RANKS.MASTER || isSystemOwner(role)) return true;

  const permissions = (session.user as any).permissions || {};
  return !!permissions[permission] || !!permissions["system.full_access"];
}

/**
 * Verifica se uma flag de UI deve ser exibida
 */
export async function show(flag: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  const ui = (session.user as any).ui || {};
  if (Object.keys(ui).length === 0) return isUserAdmin(session.user.role, (session.user as any).hierarchyLevel);

  return !!ui[flag];
}

/**
 * Exige um cargo específico
 */
export async function requireRole(requiredRole: Role): Promise<Session["user"]> {
  const user = await requireAuth();
  if (user.role !== requiredRole && !isUserAdmin(user.role, (user as any).hierarchyLevel)) {
    throw new Error("Sem permissão");
  }
  return user;
}

/**
 * Exige um dos cargos permitidos
 */
export async function requireRoles(allowedRoles: Role[]): Promise<Session["user"]> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role) && !isUserAdmin(user.role, (user as any).hierarchyLevel)) {
    throw new Error("Sem permissão");
  }
  return user;
}

/**
 * Exige acesso de administrador
 */
export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireAuth();
  if (!isUserAdmin(user.role, (user as any).hierarchyLevel)) throw new Error("Acesso restrito admin");
  return user;
}

/**
 * Exige ser o dono do recurso ou administrador
 */
export async function requireOwnerOrAdmin(resourceOwnerId: string): Promise<Session["user"]> {
  const user = await requireAuth();
  if (user.id !== resourceOwnerId && !isUserAdmin(user.role, (user as any).hierarchyLevel)) {
    throw new Error("Sem permissão recurso");
  }
  return user;
}

/**
 * Exige uma conta ativa
 */
export async function requireActiveAccount(): Promise<Session["user"]> {
  const user = await requireAuth();
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
export async function checkPermission(requiredRoles: Role[] = []): Promise<PermissionCheckResult> {
  const session = await getCurrentSession();
  if (!session?.user) return { allowed: false, user: null, reason: "Não autenticado" };

  const { role } = session.user;
  const hierarchyLevel = (session.user as any).hierarchyLevel;

  if (requiredRoles.length > 0) {
    const hasRole = requiredRoles.includes(role as Role) || isUserAdmin(role, hierarchyLevel);
    if (!hasRole) return { allowed: false, user: session.user, reason: "Sem permissão suficiente" };
  }

  if (session.user.status !== "ACTIVE") return { allowed: false, user: session.user, reason: "Conta inativa" };

  return { allowed: true, user: session.user };
}
