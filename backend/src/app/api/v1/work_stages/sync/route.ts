import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PrismaWorkStageRepository } from "@/modules/work-stages/domain/work-stage.repository";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";

const repository = new PrismaWorkStageRepository();
const service = new WorkStageService(repository);

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { siteId, projectId } = await req.json();

    if (!siteId && !projectId) {
      return ApiResponse.badRequest("Site ID or Project ID required");
    }

    const securityContext = {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: (user as any).hierarchyLevel,
      permissions: (user as any).permissions,
    };

    // Sincronização via Service (DDD) com validação de escopo
    const results = await service.syncStages(
      { siteId, projectId },
      user.companyId || "",
      securityContext,
    );

    return ApiResponse.json({ success: true, results });
  } catch (error: any) {
    if (error.message.includes("Forbidden")) {
      return ApiResponse.forbidden(error.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/sync/route.ts#POST",
    );
  }
}
