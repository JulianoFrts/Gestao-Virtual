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

const governanceService = new GovernanceService(new PrismaGovernanceRepository());
const streamService = new AuditStreamService(governanceService);

async function validateTokenFromQuery(token: string) {
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!jwtSecret) throw new Error("JWT Secret não configurada");

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    if (!payload) throw new Error("Token inválido");

    const userId = (payload.sub || payload.id) as string;
    const name = payload.name as string || "Unknown";
    const role = (payload.role as string || "").toUpperCase();

    if (!isGodRole(role)) {
      throw new Error(`Acesso restrito. Role: ${role}`);
    }

    return { id: userId, name, role };
  } catch (error: any) {
    logger.error("[SSE Auth] Erro na validação", { error: error.message });
    throw error;
  }
}

export async function HEAD() {
  return ApiResponse.noContent();
}

export async function GET(request: NextRequest) {
  try {
    const { validateToken } = await import("@/lib/auth/session");
    let currentUser;

    const token = request.nextUrl.searchParams.get("token");
    if (token) {
      const session = await validateToken(token);
      if (session?.user) currentUser = session.user;
    }

    if (!currentUser) {
      currentUser = await requireAuth();
    }

    const stream = streamService.createScanStream(currentUser.id);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: CONSTANTS.HTTP.STATUS.UNAUTHORIZED,
      headers: { "Content-Type": "application/json" },
    });
  }
}
