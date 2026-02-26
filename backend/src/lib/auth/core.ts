import { auth } from "./auth";
import { type Session } from "next-auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";
import { SystemTimeProvider } from "@/lib/utils/time-provider";
import { cache } from "react";

const timeProvider = new SystemTimeProvider();

/**
 * Obtém a sessão atual com cache por request e suporte a Bearer token
 */
export const getCurrentSession = cache(
  async (req?: NextRequest): Promise<Session | null> => {
    try {
      let session = await auth();

      if (!session) {
        session = await handleDevBypass(req);
      }

      if (!session) {
        const token = await getAuthToken(req);
        if (token) {
          const { validateToken } = await import("./validators");
          const payload = await validateToken(token);
          if (payload) {
            session = await reconstructSessionFromPayload(payload);
          }
        }
      }

      return session;
    } catch (error) {
      logger.error("Erro ao obter sessão", { error });
      return null;
    }
  },
);

/**
 * Lógica de bypass para desenvolvimento local
 */
async function handleDevBypass(req?: NextRequest): Promise<Session | null> {
  if (process.env.NODE_ENV !== "development" || !req) return null;

  const bypass = req.nextUrl.searchParams.get("bypass") === "true";
  const isLocal =
    req.nextUrl.hostname === "localhost" ||
    req.nextUrl.hostname === "127.0.0.1";

  if (bypass && isLocal) {
    logger.warn(
      "[AUTH] Bypass de segurança ativado para desenvolvimento local (Localhost Only)",
    );
    const DEV_GOD_LEVEL = 2500;
    const ONE_HOUR_MS = 3600000;
    
    return {
      user: {
        id: "dev-god-user",
        name: "God Developer",
        email: "god@agente.internal",
        role: "SUPER_ADMIN_GOD",
        status: "ACTIVE",
        isSystemAdmin: true,
        hierarchyLevel: DEV_GOD_LEVEL,
        permissions: { "*": true },
      } as any,
      expires: new Date(timeProvider.now().getTime() + ONE_HOUR_MS).toISOString(),
    };
  }
  return null;
}

/**
 * Reconstrói objeto de sessão a partir do payload do JWT
 */
async function reconstructSessionFromPayload(
  payload: any,
): Promise<Session | null> {
  const userId = payload.sub || payload.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      authCredential: {
        select: {
          email: true,
          role: true,
          status: true,
          permissions: true,
          isSystemAdmin: true,
        },
      },
      affiliation: {
        select: {
          companyId: true,
          projectId: true,
          siteId: true,
          hierarchyLevel: true,
        },
      },
    },
  });

  if (!user || !user.authCredential) return null;

  const userRole = user.authCredential.role || "OPERATIONAL";
  const permissions = await resolveMergedPermissions(user, userRole);
  const { getTokenExpiration } = await import("./validators");

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.authCredential.email,
      role: userRole,
      status: user.authCredential.status || "INACTIVE",
      companyId: user.affiliation?.companyId,
      projectId: user.affiliation?.projectId,
      siteId: user.affiliation?.siteId,
      hierarchyLevel: user.affiliation?.hierarchyLevel || 0,
      permissions,
      isSystemAdmin: !!user.authCredential.isSystemAdmin,
    } as any,
    expires: getTokenExpiration(payload),
  };
}

/**
 * Consolida permissões da matriz e overrides do usuário
 */
async function resolveMergedPermissions(user: any, role: string): Promise<Record<string, boolean>> {
  // Buscar o ID do nível de permissão associado a esta Role string/enum
  const permissionLevel = await prisma.permissionLevel.findFirst({
    where: { name: role },
    select: { id: true },
  });

  const matrixPermissions: Record<string, boolean> = {};

  if (permissionLevel) {
    const grantedModules = await prisma.permissionMatrix.findMany({
      where: {
        levelId: permissionLevel.id,
        isGranted: true,
      },
      include: {
        permissionModule: {
          select: { code: true },
        },
      },
    });

    grantedModules.forEach((m: any) => {
      if (m.permissionModule?.code) {
        matrixPermissions[m.permissionModule.code] = true;
      }
    });
  }

  const directPermissions = (user.authCredential.permissions as any) || {};
  return { ...matrixPermissions, ...directPermissions };
}

/**
 * Extrai o token de autenticação da request
 */
export async function getAuthToken(req?: NextRequest): Promise<string | null> {
  try {
    const headerList = req ? req.headers : await headers();
    const authHeader = headerList.get("authorization");

    const BEARER_PREFIX = "Bearer ";
    if (authHeader?.startsWith(BEARER_PREFIX)) {
      return authHeader.substring(BEARER_PREFIX.length);
    }

    if (req) {
      const queryToken = 
        req.nextUrl.searchParams.get("token") ||
        req.nextUrl.searchParams.get("access_token") ||
        req.nextUrl.searchParams.get("orion_token");
      
      if (queryToken) return queryToken;
    }

    const urlHeader = headerList.get("x-url") || headerList.get("referer");
    if (urlHeader) {
      try {
        const url = new URL(urlHeader);
        return url.searchParams.get("token");
      } catch {
        // Silently ignore URL parsing errors
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Invalida cache de sessão
 */
export async function invalidateSessionCache(): Promise<void> {
  // Void - Cache do React dura apenas o ciclo da request
}
