import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { FinancialAnalyticsService } from "@/modules/performance/application/financial-analytics.service";
import { z } from "zod";

const analyticsService = new FinancialAnalyticsService();

const querySchema = z.object({
    projectId: z.string().min(1),
    granularity: z.enum(['weekly', 'monthly', 'quarterly', 'annual', 'total']).default('monthly'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = Object.fromEntries(searchParams.entries());
        
        const validation = querySchema.safeParse(query);
        if (!validation.success) {
            return ApiResponse.badRequest("Parâmetros inválidos", validation.error.errors.map(e => e.message));
        }

        const data = await analyticsService.getFinancialData(validation.data);
        return ApiResponse.success(data);
    } catch (error: any) {
        return handleApiError(error, "src/app/api/v1/analytics/production/financial/route.ts#GET");
    }
}
