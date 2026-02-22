import { NextRequest } from "next/server";
import { PrismaTowerProductionRepository } from "@/modules/tower/infrastructure/prisma-tower-production.repository";
import { TowerProductionService } from "@/modules/tower/application/tower-production.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

const repository = new PrismaTowerProductionRepository();
const service = new TowerProductionService(repository);

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId is required");
    }

    const towers = await service.getTowers(projectId);
    return ApiResponse.json(towers);
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-production/route.ts#GET",
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { projectId, companyId, siteId, data } = body;

    if (!projectId || !companyId || !Array.isArray(data)) {
      return ApiResponse.badRequest("Missing required fields");
    }

    const result = await service.importTowers(
      projectId,
      companyId,
      siteId,
      data,
    );
    return ApiResponse.json(result);
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-production/route.ts#POST",
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.badRequest("id is required");
    }

    await service.deleteTower(id);
    return ApiResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-production/route.ts#DELETE",
    );
  }
}
