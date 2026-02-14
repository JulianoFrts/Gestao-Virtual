import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, isUserAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { PrismaProductionRepository } from "@/modules/production/infrastructure/prisma-production.repository";
import { ProductionService } from "@/modules/production/application/production.service";

const repository = new PrismaProductionRepository();
const service = new ProductionService(repository);

const approvalSchema = z.object({
  progressId: z.string(),
  logTimestamp: z.string(),
});

/**
 * GET - Lista logs de produção (auditoria/aprovação) extraídos do histórico JSON unificado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const towerId =
      searchParams.get("towerId") || searchParams.get("elementId");
    const pendingOnly = searchParams.get("pendingOnly") === "true";

    const isAdmin = isUserAdmin(user.role);

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

    const logs = await service.getLogsByElement(towerId, companyIdFilter);

    return ApiResponse.json(logs);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/production/logs/route.ts#GET");
  }
}

/**
 * POST - Aprova um log de produção específico dentro do histórico JSON
 */
export async function POST(request: NextRequest) {
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
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/production/logs/route.ts#POST",
    );
  }
}
