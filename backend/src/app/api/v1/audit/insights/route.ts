import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api";
import { requireAuth } from "@/lib/auth/session";
import { PrismaAuditLogRepository } from "@/modules/audit/infrastructure/prisma-audit-log.repository";
import { SecurityInsightService } from "@/modules/audit/application/security-insight.service";

const repository = new PrismaAuditLogRepository();
const insightService = new SecurityInsightService(repository);

/**
 * GET /api/v1/audit/insights
 * Retorna análise de inteligência forense baseada nos logs de auditoria.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth(request);
    const companyId = user.companyId;

    const insights = await insightService.generateInsights(companyId);

    return ApiResponse.json(insights);
  } catch (error) {
    return handleApiError(error);
  }
}
