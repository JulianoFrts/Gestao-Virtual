import { NextRequest } from "next/server";
import { requireAuth, isUserAdmin } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { logger } from "@/lib/utils/logger";
import { PrismaWorkStageRepository } from "@/modules/work-stages/domain/work-stage.repository";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";

const repository = new PrismaWorkStageRepository();
const service = new WorkStageService(repository);

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
    const { siteId, projectId } = await req.json();

    if (!siteId && !projectId) {
      return ApiResponse.badRequest("Site ID or Project ID required");
    }

    const isAdmin = isUserAdmin(user.role);

    // Sincronização via Service (DDD)
    const results = await service.syncStages(
      { siteId, projectId },
      user.companyId || "",
      isAdmin,
    );

    return ApiResponse.json({ success: true, results });
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/sync/route.ts#POST",
    );
  }
}
