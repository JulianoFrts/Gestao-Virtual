import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PrismaWorkStageRepository } from "@/modules/work-stages/domain/work-stage.repository";

const repository = new PrismaWorkStageRepository();

// DELETE: Delete all stages for a site
export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return ApiResponse.badRequest("ID do Canteiro (siteId) é obrigatório");
    }

    await repository.deleteBySite(siteId);

    return ApiResponse.json({ success: true }, "Todas as etapas do canteiro foram removidas");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/work_stages/bulk/route.ts#DELETE");
  }
}
