import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";
import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";

import { z } from "zod";

const repository = new PrismaWorkStageRepository();
const service = new WorkStageService(repository);

const reorderSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    parentId: z.string().optional().nullable(),
    displayOrder: z.number().int().min(0),
  })).min(1, "A lista de atualizações não pode estar vazia"),
});

// PUT: Reorder stages
export async function PUT(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await req.json();
    
    const validation = reorderSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { updates } = validation.data;

    await service.reorder(updates, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    return ApiResponse.json(
      { success: true },
      "Etapas reordenadas com sucesso",
    );
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message && err.message.includes("Forbidden")) {
      return ApiResponse.forbidden(err.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/reorder/route.ts#PUT",
    );
  }
}
