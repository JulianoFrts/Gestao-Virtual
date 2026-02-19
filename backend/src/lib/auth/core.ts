import { auth } from "./auth";
import { type Session } from "next-auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";

// Cache for session results within the same request
const sessionCache = new Map<string, Session | null>();

/**
 * Obtém a sessão atual com cache por request e suporte a Bearer token
 */
export async function getCurrentSession(): Promise<Session | null> {
    try {
        let cacheKey = "";
        try {
            const allHeaders = await headers();
            cacheKey = allHeaders.get("authorization") || allHeaders.get("cookie") || "default";
            if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey)!;
        } catch {
            // Provavelmente fora de uma request Next.js
        }

        let session = await auth();

        if (!session) {
            const token = await getAuthToken();
            if (token) {
                const { validateToken } = await import("./validators");
                const payload = await validateToken(token);
                if (payload) {
                    session = await reconstructSessionFromPayload(payload);
                }
            }
        }

        if (cacheKey) sessionCache.set(cacheKey, session);
        return session;
    } catch (error) {
        logger.error("Erro ao obter sessão", { error });
        return null;
    }
}

/**
 * Reconstrói objeto de sessão a partir do payload do JWT
 */
async function reconstructSessionFromPayload(payload: any): Promise<Session | null> {
    const userId = payload.sub || payload.id;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            authCredential: { select: { email: true, role: true, status: true } },
            affiliation: { select: { companyId: true, projectId: true, siteId: true } },
            hierarchyLevel: true
        }
    });

    if (!user) return null;

    const { getTokenExpiration } = await import("./validators");

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.authCredential?.email,
            role: user.authCredential?.role || "WORKER",
            status: user.authCredential?.status || "INACTIVE",
            companyId: user.affiliation?.companyId,
            projectId: user.affiliation?.projectId,
            siteId: user.affiliation?.siteId,
            hierarchyLevel: user.hierarchyLevel
        } as any,
        expires: getTokenExpiration(payload)
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
            return req.nextUrl.searchParams.get("token");
        }
        
        try {
            const urlHeader = headerList.get("x-url") || headerList.get("referer");
            if (urlHeader) {
                const url = new URL(urlHeader);
                return url.searchParams.get("token");
            }
        } catch {}

        return null;
    } catch {
        return null;
    }
}

/**
 * Invalida cache de sessão
 */
export async function invalidateSessionCache() {
    sessionCache.clear();
}
