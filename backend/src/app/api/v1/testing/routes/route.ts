import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { SystemTestingService } from "@/modules/system-testing/application/system-testing.service";
import { PrismaRouteHealthRepository } from "@/modules/system-testing/infrastructure/prisma-route-health.repository";

const repository = new PrismaRouteHealthRepository();
const service = new SystemTestingService(repository);

export async function GET() {
  try {
    const user = await requireAdmin();

    const criticalRoutes = [
      "/api/v1/users",
      "/api/v1/auth/session",
      "/api/v1/projects",
      "/api/v1/teams",
      "/api/v1/production/tower-status",
      "/api/v1/production/activities",
      "/api/v1/daily_reports",
      "/api/v1/work_stages",
      "/api/v1/audit/architectural",
      "/api/v1/audit_logs",
    ];

    const results = await service.checkCriticalRoutes(criticalRoutes, user.id);

    return ApiResponse.json(results);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/testing/routes/route.ts#GET");
  }
}
