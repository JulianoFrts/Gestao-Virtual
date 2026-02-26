import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { DatabaseManagementService } from "@/modules/system-testing/application/database-management.service";
import { requireAdmin } from "@/lib/auth/session";

const service = new DatabaseManagementService();

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * Refactored v103: Service Delegation
 */
export async function POST(request: NextRequest): Promise<Response> {
    try {
        await requireAdmin();
        const secret = process.env.APP_SECRET || "temp_secret_123";
        const emergencyToken = "RESET_EMERGENCY_2026";
        const token = request.nextUrl.searchParams.get("token");

        if (token !== secret && token !== emergencyToken) {
            return ApiResponse.unauthorized("Unauthorized access to Panic Reset");
        }

        const action = request.nextUrl.searchParams.get("action") || "sync";
        const result = await service.runAction(action);

        return ApiResponse.json(result);
    } catch (error: unknown) {
        return handleApiError(error, "src/app/api/v1/debug/db-reset/route.ts#POST");
    }
}
