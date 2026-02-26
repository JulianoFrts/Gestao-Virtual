import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";

import { z } from "zod";

const repository = new PrismaWorkStageRepository();
const service = new WorkStageService(repository);

const createBulkSchema = z.object({
  projectId: z.string().min(1, "ID do Projeto (projectId) é obrigatório"),
  siteId: z.string().optional().nullable(),
  data: z.array(z.record(z.unknown())).min(1, "Os dados de criação (data) devem ser um array não vazio"),
});

// DELETE: Delete all stages for a site
export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return ApiResponse.badRequest("ID do Canteiro (siteId) é obrigatório");
    }

    await service.deleteBySite(siteId, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    return ApiResponse.json(
      { success: true },
      "Todas as etapas do canteiro foram removidas",
    );
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message && err.message.includes("Forbidden")) {
      return ApiResponse.forbidden(err.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/bulk/route.ts#DELETE",
    );
  }
}

// POST: Create multiple stages recursively
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await req.json();
    
    const validation = createBulkSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { projectId, siteId, data } = validation.data;

    const result = await service.createBulk(projectId, siteId || undefined, data as unknown, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    return ApiResponse.json(result, "Etapas criadas com sucesso");
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message && err.message.includes("Forbidden")) {
      return ApiResponse.forbidden(err.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/bulk/route.ts#POST",
    );
  }
}
