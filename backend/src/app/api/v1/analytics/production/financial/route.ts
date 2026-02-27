import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { ProductionAnalyticsService } from "@/modules/production/application/production-analytics.service";
import { z } from "zod";
import { requireAuth, requireScope } from "@/lib/auth/session";

const analyticsService = new ProductionAnalyticsService();

const querySchema = z.object({
  projectId: z.string().min(1),
  granularity: z.enum(["weekly", "monthly", "quarterly", "annual", "total"]).default("monthly"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const validation = querySchema.safeParse(query);
    if (!validation.success) {
      return ApiResponse.badRequest(
        "Parâmetros inválidos",
        validation.error.errors.map((e) => e.message),
      );
    }

    // Validação de Escopo (Isolation)
    const { PrismaProjectRepository } = await import("@/modules/projects/infrastructure/prisma-project.repository");
    const project = await new PrismaProjectRepository().findById(validation.data.projectId);
    
    if (project) {
        await requireScope(project.companyId, "COMPANY", request);
    }

    const data = await analyticsService.getFinancialData(validation.data);
    return ApiResponse.json(data);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/analytics/production/financial/route.ts#GET",
    );
  }
}
