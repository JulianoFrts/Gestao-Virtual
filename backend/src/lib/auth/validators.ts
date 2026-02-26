import { decode } from "next-auth/jwt";
import { jwtVerify } from "jose";
import { CONSTANTS } from "@/lib/constants";
import { SystemTimeProvider } from "@/lib/utils/time-provider";

const timeProvider = new SystemTimeProvider();

interface TokenPayload {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Valida um token JWT (dual strategy: JWE e JWS)
 */
export async function validateToken(token: string): Promise<TokenPayload | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

    if (!jwtSecret) {
      console.error("[AUTH] NEXTAUTH_SECRET não configurado.");
      return null;
    }

    let payload: TokenPayload | null = null;

    // 1. Tentar decodificar como NextAuth JWE (v5)
    payload = await tryDecodeJWE(token, jwtSecret);

    // 2. Tentar decodificar como JWS (HS256) Legado
    if (!payload) {
      payload = await tryDecodeJWS(token, jwtSecret);
    }

    if (!payload?.sub && !payload?.id) {
      console.warn("[AUTH] Payload sem sub/id:", { hasPayload: !!payload });
      return null;
    }

    return payload;
  } catch (error: unknown) {
    if (error?.code !== "ERR_JWT_EXPIRED") {
      console.warn("[AUTH] Erro ao validar token:", error?.message);
    }
    return null;
  }
}

/**
 * Tenta decodificar token como JWE (NextAuth)
 */
async function tryDecodeJWE(token: string, secret: string): Promise<TokenPayload | null> {
  const JWE_PARTS = 5;
  if (token.split('.').length !== JWE_PARTS) return null;

  try {
    return await decode({
      token,
      secret,
      salt: process.env.NEXTAUTH_SALT || "authjs.session-token"
    }) as TokenPayload | null;
  } catch (e: unknown) {
    console.debug("[AUTH] Falha ao decodificar JWE:", e?.message);
    return null;
  }
}

/**
 * Tenta decodificar token como JWS (HS256 legados)
 */
async function tryDecodeJWS(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const secretBuffer = new TextEncoder().encode(secret);
    const verified = await jwtVerify(token, secretBuffer);
    return verified.payload as TokenPayload;
  } catch (e: unknown) {
    console.debug("[AUTH] Falha ao decodificar HS256:", e?.message);
    return null;
  }
}

/**
 * Calcula a data de expiração do token
 */
export function getTokenExpiration(payload: TokenPayload): string {
  if (payload?.exp) {
    return new Date((payload.exp as number) * CONSTANTS.TIME.MS_IN_SECOND).toISOString();
  }
  return new Date(timeProvider.now().getTime() + CONSTANTS.TIME.MS_IN_DAY).toISOString();
}
