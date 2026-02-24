import { NextRequest } from "next/server";
import { PrismaTowerConstructionRepository } from "@/modules/tower/infrastructure/prisma-tower-construction.repository";
import { PrismaTowerProductionRepository } from "@/modules/tower/infrastructure/prisma-tower-production.repository";
import { TowerConstructionService } from "@/modules/tower/application/tower-construction.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { logger } from "@/lib/utils/logger";

const constructionRepo = new PrismaTowerConstructionRepository();
const productionRepo = new PrismaTowerProductionRepository();
const service = new TowerConstructionService(constructionRepo, productionRepo);

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId is required");
    }

    const data = await service.getProjectData(projectId);
    return ApiResponse.json(data);
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#GET",
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const { projectId, data } = body;
    const companyId =
      body.companyId ||
      (session as any)?.user?.affiliation?.companyId ||
      (session as any)?.user?.companyId ||
      (session as any)?.companyId;

    if (!projectId || !companyId || !Array.isArray(data)) {
      logger.warn("[TOWER_CONSTRUCTION_API] Validation Failed", {
        projectId,
        companyId,
        isArray: Array.isArray(data),
      });
      return ApiResponse.badRequest(
        "Missing required fields: projectId or companyId",
      );
    }

    const result = await service.importProjectData(projectId, companyId, data);
    return ApiResponse.json(result);
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#POST",
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.badRequest("ids array is required");
    }

    for (const id of ids) {
      await constructionRepo.delete(id);
    }

    return ApiResponse.json({ deleted: ids.length });
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#DELETE",
    );
  }
}
