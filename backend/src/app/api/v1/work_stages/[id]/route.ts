import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";
import { PrismaWorkStageRepository } from "@/modules/work-stages/domain/work-stage.repository";
import { z } from "zod";
import { VALIDATION } from "@/lib/constants";

const repository = new PrismaWorkStageRepository();
const service = new WorkStageService(repository);

const updateWorkStageSchema = z.object({
  name: z.string().min(2).max(VALIDATION.STRING.MAX_NAME).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  order: z.number().int().optional(),
  displayOrder: z.number().int().optional(),
  weight: z.number().optional(),
  productionActivityId: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

interface Params {
  params: Promise<{ id: string }>;
}

// GET: Fetch a single work stage
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;

    const stages = await service.findAll({ linkedOnly: false });
    const stage = stages.find((s) => s.id === id);

    if (!stage) {
      return ApiResponse.notFound("Stage not found");
    }

    return ApiResponse.json(stage);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/[id]/route.ts#GET",
    );
  }
}

// PUT: Update a work stage
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const validation = updateWorkStageSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(
        validation.error.errors.map((e) => e.message),
      );
    }

    const stage = await service.update(id, validation.data);

    return ApiResponse.json(stage);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/[id]/route.ts#PUT",
    );
  }
}

// DELETE: Delete a work stage
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Apenas admins podem deletar? (Mantendo lógica original de requireAuth, mas poderia ser requireAdmin)
    await requireAuth();
    const { id } = await params;

    // WorkStageService doesn't have a delete method yet, let's create it or use repository
    // For now using repository as the service is just a thin wrapper for simple CRUD
    await repository.delete(id);

    return ApiResponse.json({ success: true }, "Etapa removida com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/[id]/route.ts#DELETE",
    );
  }
}
