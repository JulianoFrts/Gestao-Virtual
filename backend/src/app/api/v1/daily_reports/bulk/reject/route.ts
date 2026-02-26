import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ProductionFactory } from "@/modules/production/application/production.factory";

import { z } from "zod";

const dailyReportService = ProductionFactory.createDailyReportService();

const bulkRejectSchema = z.object({
  ids: z.array(z.string()).min(1, "A lista de IDs não pode estar vazia"),
  reason: z.string().min(1, "O motivo da devolução é obrigatório"),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const validation = bulkRejectSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.badRequest(validation.error.issues[0].message);
    }

    const { ids, reason } = validation.data;

    const result = await dailyReportService.bulkRejectReports(ids, reason);

    logger.info("Devolução em lote enfileirada", { 
      idsCount: ids.length, 
      rejectedBy: user.id,
      jobId: (result as { id?: string })?.id
    });

    return ApiResponse.json(result, "Devolução em lote enviada para processamento");
  } catch (error) {
    logger.error("Erro na devolução em lote", { error });
    return handleApiError(error);
  }
}
