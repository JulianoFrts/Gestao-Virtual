/**
 * Utilitários de Sessão - GESTÃO VIRTUAL Backend
 *
 * Funções helper para trabalhar com sessões do NextAuth (Auth.js v5)
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
 * Obtém a sessão atual do servidor
 * Suporta tanto cookie (NextAuth) quanto Bearer Token (Legado/Mobile)
 * @returns Sessão do usuário ou null se não autenticado
 */
export async function getCurrentSession(): Promise<Session | null> {
  // 1. Tentar obter sessão do NextAuth (Cookie) via auth()
  try {
    const session = await auth();
    if (session?.user) {
      // Sincronizar permissões mesmo para sessão via cookie para garantir dados frescos
      return await enrichSession(session);
    }
  } catch (err) {
    console.error("[AUTH] Erro ao obter sessão via auth():", err);
  }

  // 2. Tentar obter Bearer Token (Header)
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

      if (!jwtSecret) {
        console.error("[AUTH] JWT Secret não configurada");
        return null;
      }

      if (token) {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(token, secret);

        if (payload) {
          const userId = (payload.sub || payload.id) as string;

          // Buscar dados frescos do banco
          const freshUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            image: true,
            hierarchyLevel: true,
            authCredential: {
              select: {
                email: true,
                role: true,
                status: true,
              },
            },
            isSystemAdmin: true,
            permissions: true,
            affiliation: {
              select: {
                companyId: true,
                projectId: true,
              },
            },
          },
        } as any);

        if (freshUser) {
          const userRole = (freshUser as any).authCredential?.role || "WORKER";
          const userStatus = ((freshUser as any).authCredential?.status || "ACTIVE") as AccountStatus;
          const userEmail = (freshUser as any).authCredential?.email || "";
          const companyId = (freshUser as any).affiliation?.companyId;
          const projectId = (freshUser as any).affiliation?.projectId;

          console.log(
            `[AUTH DEBUG] User: ${freshUser.name}, Role: ${userRole}, Status: ${userStatus}, Hierarchy: ${freshUser.hierarchyLevel}`,
          );

          const permissions = await userService.getPermissionsMap(
            userRole,
            freshUser.id,
            projectId || undefined,
          );

          const uiFlags = await (userService as any).getUIFlagsMap(
            userRole,
            freshUser.hierarchyLevel,
          );

          return {
            user: {
              id: freshUser.id,
              email: userEmail,
              name: freshUser.name,
              image: freshUser.image,
              role: userRole,
              status: userStatus,
              companyId: companyId,
              projectId: projectId,
              hierarchyLevel: freshUser.hierarchyLevel,
              permissions, // Legado: Mantido por compatibilidade
              ui: uiFlags, // NOVO: Padrão do Plano de Refatoração
            } as any,
            expires: new Date(
              ((payload.exp as number) || 0) * 1000,
            ).toISOString(),
          };
        }
      }
    }
  }
  } catch (error: any) {
    if (error.code !== "ERR_JWT_EXPIRED") {
      console.warn("[AUTH] Falha na validação do token Bearer:", error.message);
    }
  }

  return null;
}

/**
 * Enriquece uma sessão existente com dados frescos do banco e permissões
 */
async function enrichSession(session: Session): Promise<Session> {
  try {
    const freshUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        hierarchyLevel: true,
        authCredential: {
          select: {
            role: true,
            status: true,
          },
        },
        isSystemAdmin: true,
        permissions: true,
        affiliation: {
          select: {
            companyId: true,
            projectId: true,
          },
        },
      },
    } as any);

    if (freshUser) {
      const userRole = (freshUser as any).authCredential?.role || "WORKER";
      const userStatus = ((freshUser as any).authCredential?.status || "ACTIVE") as AccountStatus;
      const companyId = (freshUser as any).affiliation?.companyId;
      const projectId = (freshUser as any).affiliation?.projectId;

      const permissions = await userService.getPermissionsMap(
        userRole,
        freshUser.id,
        projectId || undefined,
      );

      const uiFlags = await (userService as any).getUIFlagsMap(
        userRole,
        freshUser.hierarchyLevel,
      );

      session.user.role = userRole as any;
      session.user.status = userStatus;
      (session.user as any).companyId = companyId;
      (session.user as any).projectId = projectId;
      (session.user as any).hierarchyLevel = freshUser.hierarchyLevel;
      (session.user as any).permissions = permissions;
      (session.user as any).ui = uiFlags; // NOVO: Bloco UI dedicado
      if (freshUser.name) session.user.name = freshUser.name;
    }
  } catch (error) {
    console.error("[AUTH] Erro ao enriquecer sessão:", error);
  }
  return session;
}

/**
 * Obtém o usuário atual ou lança erro se não autenticado
 * @throws Error se não houver sessão válida
 */
export async function requireAuth(): Promise<Session["user"]> {
  const session = await getCurrentSession();

  if (!session?.user) {
    throw new Error("Não autenticado");
  }

  return session.user;
}

/**
 * Verifica se o usuário tem uma permissão funcional (Backend Driven)
 * @param permission Código da permissão (ex: 'users.manage')
 * @returns boolean
 */
export async function can(permission: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  // Super Admins e System God sempre têm acesso total
  if (isGodRole(session.user.role || "") || (session.user as any).hierarchyLevel >= SECURITY_RANKS.MASTER) return true;
  if (isSystemOwner(session.user.role || "")) return true;

  const permissions = (session.user as any).permissions || {};
  return !!permissions[permission] || !!permissions["system.full_access"];
}

/**
 * Verifica se uma flag de UI deve ser exibida para o usuário (Backend Driven UI)
 * @param flag Código da flag (ex: 'showAdminMenu')
 * @returns boolean
 */
export async function show(flag: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) return false;

  const ui = (session.user as any).ui || {};

  // Fallback: Se não houver bloco 'ui', mas for admin de alto nível
  if (Object.keys(ui).length === 0) {
    return isUserAdmin(session.user.role, (session.user as any).hierarchyLevel);
  }

  return !!ui[flag];
}

/**
 * Verifica se um usuário possui cargo administrativo (Nível >= 900)
 */
export function isUserAdmin(role?: string, hierarchyLevel?: number): boolean {
  // 1. Check by Hierarchy Level (Priority - User Request)
  if (hierarchyLevel !== undefined && hierarchyLevel >= SECURITY_RANKS.ADMIN) return true;

  // 2. Check by Role Name
  return isSystemOwner(role || "");
}

/**
 * Verifica se o usuário tem uma role específica
 * @param requiredRole Role necessária
 * @throws Error se não autenticado ou sem permissão
 */
export async function requireRole(
  requiredRole: Role,
): Promise<Session["user"]> {
  const user = await requireAuth();

  if (
    user.role !== requiredRole &&
    !isUserAdmin(user.role, (user as any).hierarchyLevel)
  ) {
    throw new Error("Sem permissão para esta ação");
  }

  return user;
}

/**
 * Verifica se o usuário tem uma das roles especificadas
 * @param allowedRoles Roles permitidas
 * @throws Error se não autenticado ou sem permissão
 */
export async function requireRoles(
  allowedRoles: Role[],
): Promise<Session["user"]> {
  const user = await requireAuth();

  if (
    !allowedRoles.includes(user.role) &&
    !isUserAdmin(user.role, (user as any).hierarchyLevel)
  ) {
    throw new Error("Sem permissão para esta ação");
  }

  return user;
}

/**
 * Verifica se o usuário é admin
 * @throws Error se não autenticado ou não for admin
 */
export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireAuth();
  if (!isUserAdmin(user.role, (user as any).hierarchyLevel)) {
    throw new Error("Acesso restrito a administradores");
  }
  return user;
}

/**
 * Verifica se o usuário é o dono do recurso ou admin
 * @param resourceOwnerId ID do dono do recurso
 * @throws Error se não autenticado ou sem permissão
 */
export async function requireOwnerOrAdmin(
  resourceOwnerId: string,
): Promise<Session["user"]> {
  const user = await requireAuth();

  if (
    user.id !== resourceOwnerId &&
    !isUserAdmin(user.role, (user as any).hierarchyLevel)
  ) {
    throw new Error("Sem permissão para acessar este recurso");
  }

  return user;
}

/**
 * Verifica se a conta do usuário está ativa
 * @throws Error se conta não estiver ativa
 */
export async function requireActiveAccount(): Promise<Session["user"]> {
  const user = await requireAuth();

  if (user.status !== "ACTIVE") {
    throw new Error("Conta não está ativa");
  }

  return user;
}

/**
 * Interface para resultado de verificação de permissão
 */
export interface PermissionCheckResult {
  allowed: boolean;
  user: Session["user"] | null;
  reason?: string;
}

/**
 * Verifica permissão sem lançar erro
 * @param requiredRoles Roles permitidas (vazio = qualquer autenticado)
 * @returns Resultado da verificação
 */
export async function checkPermission(
  requiredRoles: Role[] = [],
): Promise<PermissionCheckResult> {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      allowed: false,
      user: null,
      reason: "Não autenticado",
    };
  }

  const { role } = session.user;
  const hierarchyLevel = (session.user as any).hierarchyLevel;

  if (requiredRoles.length > 0) {
    const hasRole =
      requiredRoles.includes(role as Role) || isUserAdmin(role, hierarchyLevel);

    if (!hasRole) {
      return {
        allowed: false,
        user: session.user,
        reason: "Sem permissão suficiente",
      };
    }
  } else if (!isUserAdmin(role, hierarchyLevel)) {
    // Se nenhuma role foi especificada, permitir apenas se ativo
  }

  if (session.user.status !== "ACTIVE") {
    return {
      allowed: false,
      user: session.user,
      reason: "Conta não está ativa",
    };
  }

  return {
    allowed: true,
    user: session.user,
  };
}
