import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ProductionFactory } from "@/modules/production/application/production.factory";

const dailyReportService = ProductionFactory.createDailyReportService();

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { ids, reason } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.errorJson("Lista de IDs inválida", 400);
    }

    if (!reason || reason.trim() === "") {
      return ApiResponse.errorJson("Motivo da devolução é obrigatório", 400);
    }

    const result = await dailyReportService.bulkRejectReports(ids, reason);

    logger.info("Devolução em lote enfileirada", { 
      idsCount: ids.length, 
      rejectedBy: (user as any).id,
      jobId: (result as any).id
    });

    return ApiResponse.json(result, "Devolução em lote enviada para processamento");
  } catch (error) {
    logger.error("Erro na devolução em lote", { error });
    return handleApiError(error);
  }
}
