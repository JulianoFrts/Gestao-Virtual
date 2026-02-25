import { NextRequest } from "next/server";
import { PrismaAssetRepository } from "@/modules/infrastructure-assets/infrastructure/prisma-asset.repository";
import { AssetService } from "@/modules/infrastructure-assets/application/asset.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { logger } from "@/lib/utils/logger";

const repository = new PrismaAssetRepository();
const assetService = new AssetService(repository);

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId is required");
    }

    const data = await assetService.getConstructionData(projectId);
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
      (session as any)?.user?.companyId;

    if (!projectId || !companyId || !Array.isArray(data)) {
      return ApiResponse.badRequest("Missing required fields: projectId or companyId");
    }

    // Extrair apenas os IDs das torres para provisionamento
    const towerIds = data.map((t: any) => t.towerId || t.id).filter(Boolean);
    const result = await assetService.provisionConstruction(projectId, companyId, towerIds);
    
    return ApiResponse.json({ count: result });
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#POST",
    );
  }
}
