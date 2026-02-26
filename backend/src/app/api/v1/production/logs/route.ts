import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, isGlobalAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { ProductionFactory } from "@/modules/production/application/production.factory";

const service = ProductionFactory.create();

const approvalSchema = z.object({
  progressId: z.string(),
  logTimestamp: z.string(),
});

/**
 * GET - Lista logs de produção (auditoria/aprovação) extraídos do histórico JSON unificado
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const towerId =
      searchParams.get("towerId") || searchParams.get("elementId");
    const pendingOnly = searchParams.get("pendingOnly") === "true";

    const isAdmin = isGlobalAdmin(
      user.role,
      user.hierarchyLevel,
      (user.permissions as Record<string, boolean>),
    );

    // Multitenancy: Filtrar por empresa se não for SuperAdmin
    const companyIdFilter =
      isAdmin && user.role.includes("SUPER_ADMIN") ? null : user.companyId;

    if (pendingOnly) {
      const logs = await service.getPendingLogs(companyIdFilter);
      return ApiResponse.json(logs);
    }

    if (!towerId) {
      return ApiResponse.badRequest("towerId/elementId é obrigatório");
    }

    const logs = await service.getLogsByElement(towerId);

    return ApiResponse.json(logs);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/production/logs/route.ts#GET");
  }
}

/**
 * POST - Aprova um log de produção específico dentro do histórico JSON
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();

    const body = await request.json();

    const validation = approvalSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponse.badRequest(
        "progressId e logTimestamp são obrigatórios",
      );
    }

    const { progressId, logTimestamp } = validation.data;

    const updatedProgress = await service.approveLog(
      progressId,
      logTimestamp,
      user.name || "Sistema",
      user.id,
    );

    return ApiResponse.json(updatedProgress, "Log aprovado com sucesso");
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/production/logs/route.ts#POST",
    );
  }
}
