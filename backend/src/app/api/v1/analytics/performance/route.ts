import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PerformanceAnalyticsService } from "@/modules/performance/application/performance-analytics.service";

const analyticsService = new PerformanceAnalyticsService();

/**
 * GET /api/v1/analytics/performance
 * Retorna os KPIs reais do projeto (SPI, CPI, HH, Progresso)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId é obrigatório");
    }

    const metrics = await analyticsService.getProjectMetrics(projectId);

    return ApiResponse.json(metrics);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/analytics/performance/route.ts#GET");
  }
}
