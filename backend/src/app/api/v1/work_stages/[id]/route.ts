import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";
import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";
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
  metadata: z.record(z.unknown()).optional().nullable(),
});

interface Params {
  params: Promise<{ id: string }>;
}

// GET: Fetch a single work stage
export async function GET(req: NextRequest, { params }: Params): Promise<Response> {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const securityContext = {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    };

    // Usando findAll com filtro de id para garantir validação de escopo centralizada (ou poderíamos ler individualmente)
    // Para simplificar, vou filtrar o findAll que já tem a lógica de companyId
    const stages = await service.findAll({}, securityContext);
    const stage = stages.find((s) => s.id === id);

    if (!stage) {
      return ApiResponse.notFound("Stage not found or access denied");
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
export async function PUT(req: NextRequest, { params }: Params): Promise<Response> {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const validation = updateWorkStageSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(
        validation.error.errors.map((e) => e.message),
      );
    }

    const stage = await service.update(id, validation.data as Record<string, unknown>, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    return ApiResponse.json(stage);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message && err.message.includes("Forbidden")) {
      return ApiResponse.forbidden(err.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/[id]/route.ts#PUT",
    );
  }
}

// DELETE: Delete a work stage
export async function DELETE(req: NextRequest, { params }: Params): Promise<Response> {
  try {
    const user = await requireAuth();
    const { id } = await params;

    await service.delete(id, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    return ApiResponse.json({ success: true }, "Etapa removida com sucesso");
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message && err.message.includes("Forbidden")) {
      return ApiResponse.forbidden(err.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/[id]/route.ts#DELETE",
    );
  }
}
