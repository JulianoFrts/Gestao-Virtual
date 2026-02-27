import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { AuditLogService } from "@/modules/audit/application/audit-log.service";
import { PrismaAuditLogRepository } from "@/modules/audit/infrastructure/prisma-audit-log.repository";
import type { Session } from "next-auth";

import { z } from "zod";

// DI
const auditLogService = new AuditLogService(new PrismaAuditLogRepository());

const createLogSchema = z.object({
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().optional().nullable(),
  details: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
  route: z.string().optional(),
  stream: z.boolean().optional(),
  token: z.string().optional(),
});

export async function HEAD(): Promise<Response> {
  return ApiResponse.noContent();
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const currentUser = await requireAuth(request);

    const isGlobal = isGlobalAdmin(
      currentUser.role,
      currentUser.hierarchyLevel,
      currentUser.permissions as Record<string, boolean>,
    );
    const { CONSTANTS } = await import("@/lib/constants");
    const stream = generateAuditLogsStream(currentUser, isGlobal, CONSTANTS);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/audit_logs/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const rawBody = await request.json();
    const validation = createLogSchema.safeParse(rawBody);
    
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }
    
    const body = validation.data;
    const { HTTP_STATUS, CONSTANTS } = await import("@/lib/constants");

    // Lógica para Iniciar Stream via POST (Auth via JSON)
    if (body.stream === true || body.token) {
      const { isGlobalAdmin } =
        await import("@/lib/auth/session");
      
      const user = await requireAuth(request);

      const isGlobal = isGlobalAdmin(
        user.role,
        user.hierarchyLevel,
        user.permissions as Record<string, boolean>,
      );

      const stream = generateAuditLogsStream(user, isGlobal, CONSTANTS);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Lógica Original: Registro de Log Manual
    const user = await requireAuth(request);
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";

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
    ip = request.headers.get("x-real-ip") || (request as unknown).ip || "127.0.0.1";
  }

  return ip === ":: 1" ? "127.0.0.1" : ip;
}

/**
 * Função Auxiliar para gerar o Stream de Logs (SRP)
 */
function generateAuditLogsStream(
  currentUser: Session["user"],
  isGlobal: boolean,
  constants: unknown,
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller): Promise<unknown> {
      const sendEvent = (type: string, data: Record<string, unknown>) => {
        try {
          const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(event));
        } catch {
          // Stream fechado
        }
      };

      try {
        const total = await auditLogService.countLogs({
          isGlobalAccess: isGlobal,
          companyId: currentUser.companyId,
        });

        sendEvent("start", { total });

        const BATCH_SIZE = constants.API.BATCH.SIZE;
        let processed = 0;

        while (processed < total) {
          const logs = await auditLogService.listLogs({
            limit: BATCH_SIZE,
            skip: processed,
            isGlobalAccess: isGlobal,
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

          await new Promise((resolve) =>
            setTimeout(resolve, constants.API.THROTTLE.MS),
          );
        }

        sendEvent("complete", { total });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendEvent("error", { message });
      } finally {
        controller.close();
      }
    },
  });
}
