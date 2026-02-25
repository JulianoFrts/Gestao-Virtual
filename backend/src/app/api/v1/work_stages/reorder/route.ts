import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";
import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";

const repository = new PrismaWorkStageRepository();
const service = new WorkStageService(repository);

// PUT: Reorder stages
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return ApiResponse.badRequest(
        "O formato dos dados é inválido. Esperado um array de atualizações.",
      );
    }

    await service.reorder(updates, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: (user as any).hierarchyLevel,
      permissions: (user as any).permissions,
    });

    return ApiResponse.json(
      { success: true },
      "Etapas reordenadas com sucesso",
    );
  } catch (error: any) {
    if (error.message.includes("Forbidden")) {
      return ApiResponse.forbidden(error.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/reorder/route.ts#PUT",
    );
  }
}
