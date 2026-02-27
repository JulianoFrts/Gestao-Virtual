import { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { isGodRole } from "@/lib/constants/security";
import { AuditStreamService } from "@/modules/audit/application/audit-stream.service";
import { GovernanceService } from "@/modules/audit/application/governance.service";
import { PrismaGovernanceRepository } from "@/modules/audit/infrastructure/prisma-governance.repository";
import { logger } from "@/lib/utils/logger";
import { jwtVerify } from "jose";
import { CONSTANTS } from "@/lib/constants";

const governanceService = new GovernanceService(
  new PrismaGovernanceRepository(),
);
const streamService = new AuditStreamService(governanceService);

interface ValidatedUser {
  id: string;
  name: string;
  role: string;
}

/**
 * Valida o token JWT diretamente da query string para conexões SSE.
 * Garante que apenas usuários com nível GOD (Sistema/Admin) possam abrir o stream.
 */
async function validateTokenFromQuery(token: string): Promise<ValidatedUser> {
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!jwtSecret) {
    logger.error("[SSE Auth] Falha crítica: JWT_SECRET não definida");
    throw new Error("Erro interno de configuração de segurança");
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    if (!payload || (!payload.sub && !payload.id)) {
      throw new Error("Token inválido ou malformado");
    }

    const userId = (payload.sub || payload.id) as string;
    const name = (payload.name as string) || "Audit Streamer";
    const role = ((payload.role as string) || "").toUpperCase();

    // Validação estrita de nível de sistema para este endpoint
    if (!isGodRole(role)) {
      logger.warn("[SSE Auth] Tentativa de acesso não autorizado", {
        userId,
        role,
      });
      throw new Error(
        `Acesso restrito. Privilégios insuficientes para nível: ${role}`,
      );
    }

    return { id: userId, name, role };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[SSE Auth] Erro na validação do token", { message });
    throw new Error("Falha na autenticação do stream");
  }
}

export async function HEAD(): Promise<Response> {
  return ApiResponse.noContent();
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleStreamRequest(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleStreamRequest(request);
}

async function handleStreamRequest(request: NextRequest): Promise<Response> {
  try {
    let authUser: { id: string; role: string };

    // 1. Tentar autenticação via Sessão padrão (Headers/Cookies)
    try {
      const user = await requireAuth(request);
      authUser = { id: user.id, role: user.role };
    } catch {
      // 2. Fallback para token na query (Padrão SSE quando headers não são suportados)
      const token = request.nextUrl.searchParams.get("token");
      if (!token) {
        throw new Error("Autenticação via token obrigatória para este stream");
      }
      const validated = await validateTokenFromQuery(token);
      authUser = { id: validated.id, role: validated.role };
    }

    // 3. Verificação final de privilégio God Role
    if (!isGodRole(authUser.role)) {
      throw new Error(
        "Permissão negada: Este recurso requer acesso de nível Sistema",
      );
    }

    logger.info("[SSE Audit] Conectando stream de auditoria", {
      userId: authUser.id,
    });

    const stream = streamService.createScanStream(authUser.id);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*", // Permitir cross-origin se necessário para SSE
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    const status = message.includes("Permissão")
      ? CONSTANTS.HTTP.STATUS.FORBIDDEN
      : CONSTANTS.HTTP.STATUS.UNAUTHORIZED;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
