import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PerformanceAnalyticsService } from "@/modules/performance/application/performance-analytics.service";

const analyticsService = new PerformanceAnalyticsService();

/**
 * GET /api/v1/analytics/teams
 * Retorna o desempenho detalhado por equipe
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId é obrigatório");
    }

    const teamMetrics = await analyticsService.getTeamPerformance(projectId);

    return ApiResponse.json(teamMetrics);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/analytics/teams/route.ts#GET");
  }
}
