import { NextRequest } from "next/server";
import { PrismaAssetRepository } from "@/modules/infrastructure-assets/infrastructure/prisma-asset.repository";
import { AssetService } from "@/modules/infrastructure-assets/application/asset.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { logger } from "@/lib/utils/logger";

import { z } from "zod";

const repository = new PrismaAssetRepository();
const assetService = new AssetService(repository);

const provisionConstructionSchema = z.object({
  projectId: z.string().min(1),
  companyId: z.string().optional(),
  data: z.array(z.object({
    towerId: z.string().optional(),
    id: z.string().optional(),
  })).min(1),
});

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId is required");
    }

    const data = await assetService.getConstructionData(projectId);
    return ApiResponse.json(data);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#GET",
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const validation = provisionConstructionSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { projectId, data } = validation.data;
    const companyId =
      validation.data.companyId ||
      user.companyId;

    if (!companyId) {
      return ApiResponse.badRequest("companyId is required");
    }

    // Extrair apenas os IDs das torres para provisionamento
    const towerIds = data.map((t) => t.towerId || t.id).filter((id): id is string => !!id);
    const result = await assetService.provisionConstruction(projectId, companyId, towerIds);
    
    return ApiResponse.json({ count: result });
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#POST",
    );
  }
}
