import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ProductionFactory } from "@/modules/production/application/production.factory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const dailyReportService = ProductionFactory.createDailyReportService();

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAuth();

    const report = await dailyReportService.getReportById(id);

    return ApiResponse.json(report);
  } catch (error) {
    logger.error("Erro ao buscar relatório", { reportId: id, error });
    return handleApiError(error);
  }
}
