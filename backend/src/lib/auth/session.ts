/**
 * Utilitários de Sessão - GESTÃO VIRTUAL Backend
 */

import { auth } from "./auth";
import type { Session } from "next-auth";
import { decode } from "next-auth/jwt";
import { headers } from "next/headers";
import { jwtVerify } from "jose";

import { prisma } from "@/lib/prisma/client";
import type { Role, AccountStatus } from "@/types/database";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { CONSTANTS } from "@/lib/constants";
import { isGodRole, isSystemOwner, SECURITY_RANKS } from "@/lib/constants/security";
import { cacheService } from "@/services/cacheService";

const userService = new UserService(new PrismaUserRepository());

/** TTL do cache de sessão em segundos (60s = 1 minuto) */
const SESSION_CACHE_TTL = 60;

/**
 * Helper para buscar usuário fresco e mapear dados de sessão.
 * Usa cache in-memory com TTL de 60s para evitar queries repetidas ao banco.
 */
async function fetchUserSessionData(userId: string) {
  const cacheKey = `session:${userId}`;

  // Verificar cache primeiro
  const cached = await cacheService.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

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

  const result = {
    ...freshUser,
    role: userRole,
    status: userStatus,
    companyId,
    projectId,
    permissions,
    ui: uiFlags
  };

  // Salvar no cache por SESSION_CACHE_TTL segundos
  await cacheService.set(cacheKey, result, SESSION_CACHE_TTL);

  return result;
}

/**
 * Invalida o cache de sessão de um usuário específico.
 * Deve ser chamado após atualização de perfil, role ou permissões.
 */
export async function invalidateSessionCache(userId: string): Promise<void> {
  await cacheService.del(`session:${userId}`);
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


export async function validateToken(token: string): Promise<Session | null> {

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

    if (!jwtSecret) {
      console.error("[AUTH] NEXTAUTH_SECRET não configurado.");
      return null;
    }

    let payload: any = null;

    // 1. Tentar decodificar como NextAuth JWE (padrão v5)
    // CHECK: Só tentar decodificar se parecer um JWE (5 partes) para evitar logs de erro em tokens JWS
    if (token.split('.').length === 5) {
      try {
        payload = await decode({ 
          token, 
          secret: jwtSecret,
          salt: process.env.NEXTAUTH_SALT || "authjs.session-token"
        });
        if (payload) console.debug("[AUTH] Token decodificado via JWE");
      } catch (e: any) {
        console.debug("[AUTH] Falha ao decodificar JWE:", e.message);
      }
    }

    // 2. Se falhar ou retornar null, tentar como JWS (HS256) - usado pelo login legado
    if (!payload) {
      try {
        const secret = new TextEncoder().encode(jwtSecret);
        const verified = await jwtVerify(token, secret);
        payload = verified.payload;
        if (payload) console.debug("[AUTH] Token decodificado via HS256 (Legado)");
      } catch (e: any) {
        console.debug("[AUTH] Falha ao decodificar HS256:", e.message);
      }
    }

    if (!payload?.sub && !payload?.id) {
       console.warn("[AUTH] Payload sem sub/id:", { hasPayload: !!payload });
       return null;
    }



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
      expires: payload.exp ? new Date((payload.exp as number) * 1000).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error: any) {
    if (error.code !== "ERR_JWT_EXPIRED") {
      console.warn("[AUTH] Erro ao validar token:", error.message);
    }
    return null;
  }
}


async function getBearerSession(): Promise<Session | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const bearerPrefix = "Bearer ";

    let token: string | null = null;

    if (authHeader?.startsWith(bearerPrefix)) {
      token = authHeader.substring(bearerPrefix.length);
    } else {
      // Suporte para token na query (EventSource/SSE) 
      // Em Next.js Route Handlers, podemos extrair da URL se passarmos.
      // Como getCurrentSession() não recebe o request, tentamos via cabeçalhos de URL original se presentes.
      const xUrl = headersList.get("x-url") || headersList.get("referer");
      if (xUrl) {
        try {
          const url = new URL(xUrl);
          token = url.searchParams.get("token");
        } catch (e) {}
      }
    }

    if (!token) return null;
    return await validateToken(token);
  } catch (error: any) {
    return null;
  }
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
