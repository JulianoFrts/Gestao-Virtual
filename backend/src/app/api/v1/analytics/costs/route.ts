import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PerformanceAnalyticsService } from "@/modules/performance/application/performance-analytics.service";

const analyticsService = new PerformanceAnalyticsService();

/**
 * GET /api/v1/analytics/costs
 * Retorna a distribuição de custos por categoria
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId é obrigatório");
    }

    const costs = await analyticsService.getCostDistribution(projectId);

    return ApiResponse.json(costs);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/analytics/costs/route.ts#GET");
  }
}
