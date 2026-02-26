import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ProductionFactory } from "@/modules/production/application/production.factory";

import { z } from "zod";

import { HTTP_STATUS } from "@/lib/constants";

const dailyReportService = ProductionFactory.createDailyReportService();

const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, "A lista de IDs não pode estar vazia"),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requireAuth();
    const body = await request.json();
    
    const validation = bulkActionSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.badRequest(validation.error.issues[0].message);
    }

    const { ids } = validation.data;

    const result = await dailyReportService.bulkApproveReports(ids, user.id);

    logger.info("Aprovação em lote enfileirada", { 
      idsCount: ids.length, 
      approvedBy: user.id,
      jobId: (result as { id?: string })?.id
    });

    return ApiResponse.json(result, "Aprovação em lote enviada para processamento");
  } catch (error) {
    logger.error("Erro na aprovação em lote", { error });
    return handleApiError(error);
  }
}
