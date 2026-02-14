import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { AuditLogService } from "@/modules/audit/application/audit-log.service";
import { PrismaAuditLogRepository } from "@/modules/audit/infrastructure/prisma-audit-log.repository";

// DI
const auditLogService = new AuditLogService(new PrismaAuditLogRepository());

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(currentUser.role);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const logs = await auditLogService.listLogs({
      limit,
      isAdmin,
      companyId: (currentUser as any).companyId,
    });

    return ApiResponse.json(logs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Extrair IP do cliente
    const forwardedFor = request.headers.get("x-forwarded-for");
    let clientIp = "127.0.0.1";
    if (forwardedFor) {
      clientIp = forwardedFor.split(",")[0]?.trim();
    } else {
      clientIp =
        request.headers.get("x-real-ip") || (request as any).ip || "127.0.0.1";
    }
    if (clientIp === "::1") clientIp = "127.0.0.1";

    const userAgent = request.headers.get("user-agent");

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

    return ApiResponse.json(log, "Log registrado", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
