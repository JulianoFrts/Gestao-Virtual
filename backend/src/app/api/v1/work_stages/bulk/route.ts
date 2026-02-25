import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";

const repository = new PrismaWorkStageRepository();
const service = new WorkStageService(repository);

// DELETE: Delete all stages for a site
export async function DELETE(req: NextRequest) {
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
      hierarchyLevel: (user as any).hierarchyLevel,
      permissions: (user as any).permissions,
    });

    return ApiResponse.json(
      { success: true },
      "Todas as etapas do canteiro foram removidas",
    );
  } catch (error: any) {
    if (error.message.includes("Forbidden")) {
      return ApiResponse.forbidden(error.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/bulk/route.ts#DELETE",
    );
  }
}

// POST: Create multiple stages recursively
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { projectId, siteId, data } = body;

    if (!projectId) {
      return ApiResponse.badRequest("ID do Projeto (projectId) é obrigatório");
    }

    if (!data || !Array.isArray(data)) {
      return ApiResponse.badRequest(
        "Os dados de criação (data) devem ser um array",
      );
    }

    const result = await service.createBulk(projectId, siteId, data, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: (user as any).hierarchyLevel,
      permissions: (user as any).permissions,
    });

    return ApiResponse.json(result, "Etapas criadas com sucesso");
  } catch (error: any) {
    if (error.message.includes("Forbidden")) {
      return ApiResponse.forbidden(error.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/bulk/route.ts#POST",
    );
  }
}
