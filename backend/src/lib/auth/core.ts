import { auth } from "./auth";
import { type Session } from "next-auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";

// Cache for session results within the same request
import { cache } from "react";

/**
 * Obtém a sessão atual com cache por request e suporte a Bearer token
 */
export const getCurrentSession = cache(
  async (req?: NextRequest): Promise<Session | null> => {
    try {
      let session = await auth();

      // 2. Fallback: Se não houver sessão via cookie, tentar extrair token (Bearer ou Query)
      if (!session) {
        // [DEV ONLY] Bypass para testes locais
        if (process.env.NODE_ENV === "development" && req) {
          const bypass = req.nextUrl.searchParams.get("bypass") === "true";
          const isLocal =
            req.nextUrl.hostname === "localhost" ||
            req.nextUrl.hostname === "127.0.0.1";

          if (bypass && isLocal) {
            logger.warn(
              "[AUTH] Bypass de segurança ativado para desenvolvimento local (Localhost Only)",
            );
            return {
              user: {
                id: "dev-god-user",
                name: "God Developer",
                email: "god@agente.internal",
                role: "SUPER_ADMIN_GOD",
                status: "ACTIVE",
                isSystemAdmin: true,
                hierarchyLevel: 2500,
                permissions: { "*": true },
              } as any,
              expires: new Date(Date.now() + 3600000).toISOString(),
            };
          }
        }

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
      authCredential: { select: { email: true, role: true, status: true } },
      affiliation: {
        select: { companyId: true, projectId: true, siteId: true },
      },
      hierarchyLevel: true,
      permissions: true,
    },
  });

  if (!user) return null;

  const userRole = user.authCredential?.role || "WORKER";

  // Fetch role-based permissions from Matrix
  const grantedModules = await prisma.permissionMatrix.findMany({
    where: {
      levelId: userRole,
      isGranted: true,
    },
    include: {
      permissionModule: {
        select: { code: true },
      },
    },
  });

  const matrixPermissions: Record<string, boolean> = {};
  grantedModules.forEach((m: any) => {
    if (m.permissionModule?.code) {
      matrixPermissions[m.permissionModule.code] = true;
    }
  });

  // Merge with user direct permissions
  const directPermissions = (user.permissions as any) || {};
  const mergedPermissions = { ...matrixPermissions, ...directPermissions };

  const { getTokenExpiration } = await import("./validators");

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.authCredential?.email,
      role: userRole,
      status: user.authCredential?.status || "INACTIVE",
      companyId: user.affiliation?.companyId,
      projectId: user.affiliation?.projectId,
      siteId: user.affiliation?.siteId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: mergedPermissions,
    } as any,
    expires: getTokenExpiration(payload),
  };
}

/**
 * Extrai o token de autenticação da request
 */
export async function getAuthToken(req?: NextRequest): Promise<string | null> {
  try {
    const headerList = req ? req.headers : await headers();
    const authHeader = headerList.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    if (req) {
      return (
        req.nextUrl.searchParams.get("token") ||
        req.nextUrl.searchParams.get("access_token") ||
        req.nextUrl.searchParams.get("orion_token")
      );
    }

    try {
      const urlHeader = headerList.get("x-url") || headerList.get("referer");
      if (urlHeader) {
        const url = new URL(urlHeader);
        return url.searchParams.get("token");
      }
    } catch {
      /* empty */
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Invalida cache de sessão (Não precisa mais fazer nada manualmente, pois o react.cache() dura apenas o request)
 */
export async function invalidateSessionCache() {
  // void
}
