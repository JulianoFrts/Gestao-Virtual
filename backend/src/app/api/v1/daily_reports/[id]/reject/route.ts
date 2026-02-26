import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ProductionFactory } from "@/modules/production/application/production.factory";
import { z } from "zod";
import { VALIDATION } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const dailyReportService = ProductionFactory.createDailyReportService();

const rejectSchema = z.object({
  reason: z.string().min(VALIDATION.STRING.MIN_EMAIL, `O motivo deve ter pelo menos ${VALIDATION.STRING.MIN_EMAIL} caracteres`),
});

export async function POST(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  try {
    await requireAuth();

    const body = await request.json();
    const { reason } = rejectSchema.parse(body);

    const report = await dailyReportService.rejectReport(id, reason);

    logger.info("Relatório rejeitado/devolvido", { reportId: id, reason });

    return ApiResponse.json(report, "Relatório devolvido para correção");
  } catch (error) {
    logger.error("Erro ao rejeitar relatório", { reportId: id, error });
    return handleApiError(error);
  }
}
