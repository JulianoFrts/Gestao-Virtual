/**
 * Utilitários de Sessão - GESTÃO VIRTUAL Backend
 */

import { auth } from "./auth";
import type { Session } from "next-auth";
import { headers } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma/client";
import type { Role, AccountStatus } from "@/types/database";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { isGodRole, isSystemOwner, SECURITY_RANKS } from "@/lib/constants/security";

const userService = new UserService(new PrismaUserRepository());

/**
 * Helper para buscar usuário fresco e mapear dados de sessão
 */
async function fetchUserSessionData(userId: string) {
  const freshUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, image: true, hierarchyLevel: true, isSystemAdmin: true, permissions: true,
      authCredential: { select: { email: true, role: true, status: true } },
      affiliation: { select: { companyId: true, projectId: true } },
    },
  });

  if (!freshUser) return null;

  const userRole = (freshUser as any).authCredential?.role || "WORKER";
  const userStatus = ((freshUser as any).authCredential?.status || "ACTIVE") as AccountStatus;
  const companyId = (freshUser as any).affiliation?.companyId;
  const projectId = (freshUser as any).affiliation?.projectId;

  const permissions = await userService.getPermissionsMap(userRole, freshUser.id, projectId || undefined);
  const uiFlags = await (userService as any).getUIFlagsMap(userRole, freshUser.hierarchyLevel);

  return {
    ...freshUser,
    role: userRole,
    status: userStatus,
    companyId,
    projectId,
    permissions,
    ui: uiFlags
  };
}

/**
 * Obtém a sessão atual do servidor (Dual Strategy: Cookie vs Bearer)
 */
export async function getCurrentSession(): Promise<Session | null> {
  // Strategy 1: NextAuth Cookie
  try {
    const session = await auth();
    // Removido o enrichSession redundante que buscava dados no banco em cada req.
    // O NextAuth já traz os dados mapeados via callbacks no JWT.
    if (session?.user) return session;
  } catch (err) {
    console.error("[AUTH] Erro auth():", err);
  }

  // Strategy 2: Bearer Token
  return await getBearerSession();
}

async function getBearerSession(): Promise<Session | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) return null;

    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    if (!payload?.sub && !payload?.id) return null;

    const userId = (payload.sub || payload.id) as string;
    const userData = await fetchUserSessionData(userId);

    if (!userData) return null;

    return {
      user: {
        id: userData.id,
        email: userData.authCredential?.email || "",
        name: userData.name,
        image: userData.image,
        role: userData.role as any,
        status: userData.status,
        companyId: userData.companyId,
        projectId: userData.projectId,
        hierarchyLevel: userData.hierarchyLevel,
        permissions: userData.permissions,
        ui: userData.ui,
      } as any,
      expires: new Date(((payload.exp as number) || 0) * 1000).toISOString(),
    };
  } catch (error: any) {
    if (error.code !== "ERR_JWT_EXPIRED") {
      console.warn("[AUTH] Token inválido:", error.message);
    }
  }
  return null;
}

/**
 * Enriquece uma sessão existente
 */
async function enrichSession(session: Session): Promise<Session> {
  try {
    const userData = await fetchUserSessionData(session.user.id);
    if (userData) {
      session.user.role = userData.role as any;
      session.user.status = userData.status;
      (session.user as any).companyId = userData.companyId;
      (session.user as any).projectId = userData.projectId;
      (session.user as any).hierarchyLevel = userData.hierarchyLevel;
      (session.user as any).permissions = userData.permissions;
      (session.user as any).ui = userData.ui;
      if (userData.name) session.user.name = userData.name;
    }
  } catch (error) {
    console.error("[AUTH] Erro enrichSession:", error);
  }
  return session;
}

/**
 * Obtém o usuário atual ou lança erro
 */
export async function requireAuth(): Promise<Session["user"]> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Não autenticado");
  return session.user;
}

export async function can(permission: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  const { role, hierarchyLevel } = session.user as any;
  if (isGodRole(role) || hierarchyLevel >= SECURITY_RANKS.MASTER || isSystemOwner(role)) return true;

  const permissions = (session.user as any).permissions || {};
  return !!permissions[permission] || !!permissions["system.full_access"];
}

export async function show(flag: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  const ui = (session.user as any).ui || {};
  if (Object.keys(ui).length === 0) return isUserAdmin(session.user.role, (session.user as any).hierarchyLevel);

  return !!ui[flag];
}

export function isUserAdmin(role?: string, hierarchyLevel?: number): boolean {
  if (hierarchyLevel !== undefined && hierarchyLevel >= SECURITY_RANKS.ADMIN) return true;
  return isSystemOwner(role || "");
}

export async function requireRole(requiredRole: Role): Promise<Session["user"]> {
  const user = await requireAuth();
  if (user.role !== requiredRole && !isUserAdmin(user.role, (user as any).hierarchyLevel)) {
    throw new Error("Sem permissão");
  }
  return user;
}

export async function requireRoles(allowedRoles: Role[]): Promise<Session["user"]> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role) && !isUserAdmin(user.role, (user as any).hierarchyLevel)) {
    throw new Error("Sem permissão");
  }
  return user;
}

export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireAuth();
  if (!isUserAdmin(user.role, (user as any).hierarchyLevel)) throw new Error("Acesso restrito admin");
  return user;
}

export async function requireOwnerOrAdmin(resourceOwnerId: string): Promise<Session["user"]> {
  const user = await requireAuth();
  if (user.id !== resourceOwnerId && !isUserAdmin(user.role, (user as any).hierarchyLevel)) {
    throw new Error("Sem permissão recurso");
  }
  return user;
}

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
