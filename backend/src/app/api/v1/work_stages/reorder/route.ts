import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PrismaWorkStageRepository } from "@/modules/work-stages/domain/work-stage.repository";

const repository = new PrismaWorkStageRepository();

// PUT: Reorder stages
export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return ApiResponse.badRequest("O formato dos dados é inválido. Esperado um array de atualizações.");
    }

    await repository.reorder(updates);

    return ApiResponse.json({ success: true }, "Etapas reordenadas com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/work_stages/reorder/route.ts#PUT");
  }
}
