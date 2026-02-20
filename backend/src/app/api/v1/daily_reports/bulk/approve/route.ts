import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ProductionFactory } from "@/modules/production/application/production.factory";

const dailyReportService = ProductionFactory.createDailyReportService();

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.errorJson("Lista de IDs inválida", 400);
    }

    const result = await dailyReportService.bulkApproveReports(ids, (user as any).id);

    logger.info("Aprovação em lote enfileirada", { 
      idsCount: ids.length, 
      approvedBy: (user as any).id,
      jobId: (result as any).id
    });

    return ApiResponse.json(result, "Aprovação em lote enviada para processamento");
  } catch (error) {
    logger.error("Erro na aprovação em lote", { error });
    return handleApiError(error);
  }
}
