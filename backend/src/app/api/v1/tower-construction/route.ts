import { NextRequest } from "next/server";
import { PrismaTowerConstructionRepository } from "@/modules/tower/infrastructure/prisma-tower-construction.repository";
import { TowerConstructionService } from "@/modules/tower/application/tower-construction.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

const repository = new PrismaTowerConstructionRepository();
const service = new TowerConstructionService(repository);

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
    await requireAuth();
    const body = await req.json();
    const { projectId, companyId, data } = body;

    if (!projectId || !companyId || !Array.isArray(data)) {
      return ApiResponse.badRequest("Missing required fields");
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
