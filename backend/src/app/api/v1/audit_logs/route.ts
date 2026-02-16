import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { AuditLogService } from "@/modules/audit/application/audit-log.service";
import { PrismaAuditLogRepository } from "@/modules/audit/infrastructure/prisma-audit-log.repository";

// DI
const auditLogService = new AuditLogService(new PrismaAuditLogRepository());

export async function GET(request: NextRequest) {
  try {
    const { validateToken } = await import("@/lib/auth/session");
    let currentUser;

    // Suporte a Token na URL para SSE (EventSource não suporta headers customizados facilmente)
    const token = request.nextUrl.searchParams.get("token");
    if (token) {
      const session = await validateToken(token);
      if (session?.user) currentUser = session.user;
    }

    if (!currentUser) {
      currentUser = await requireAuth();
    }

    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(currentUser.role);
    const { CONSTANTS } = await import("@/lib/constants");
    const stream = generateAuditLogsStream(currentUser, isAdmin, CONSTANTS);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/audit_logs/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent");
    const { HTTP_STATUS } = await import("@/lib/constants");

    const log = await auditLogService.createLog({
      userId: user.id,
      action: body.action,
      entity: body.entity,
      entityId: body.entityId,
      newValues: body.details || {},
      oldValues: body.metadata || null,
      ipAddress: clientIp,
      userAgent: userAgent,
      route: body.route || request.nextUrl.pathname,
    });

    return ApiResponse.json(log, "Log registrado", HTTP_STATUS.CREATED);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/audit_logs/route.ts#POST");
  }
}

/**
 * Função Auxiliar para detecção de IP (SRP)
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  let ip = "127.0.0.1";
  
  if (forwardedFor) {
    ip = forwardedFor.split(",")[0]?.trim();
  } else {
    ip = request.headers.get("x-real-ip") || (request as any).ip || "127.0.0.1";
  }

  return ip === "::1" ? "127.0.0.1" : ip;
}

/**
 * Função Auxiliar para gerar o Stream de Logs (SRP)
 */
function generateAuditLogsStream(currentUser: any, isAdmin: boolean, CONSTANTS: any): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: any) => {
        try {
          const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(event));
        } catch (e) {
          // Stream fechado
        }
      };

      try {
        const total = await auditLogService.countLogs({
          isAdmin,
          companyId: currentUser.companyId,
        });

        sendEvent("start", { total });

        const BATCH_SIZE = CONSTANTS.API.BATCH.SIZE;
        let processed = 0;

        while (processed < total) {
          const logs = await auditLogService.listLogs({
            limit: BATCH_SIZE,
            skip: processed,
            isAdmin,
            companyId: currentUser.companyId,
          });

          if (logs.length === 0) break;

          processed += logs.length;
          const progress = Math.round((processed / total) * 100);

          sendEvent("batch", {
            items: logs,
            current: processed,
            total,
            progress,
          });

          await new Promise((resolve) => setTimeout(resolve, CONSTANTS.API.THROTTLE.MS));
        }

        sendEvent("complete", { total });
      } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        sendEvent("error", { message });
      } finally {
        controller.close();
      }
    },
  });
}
