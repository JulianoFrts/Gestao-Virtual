import { NextRequest } from "next/server";
import { PrismaTowerProductionRepository } from "@/modules/tower/infrastructure/prisma-tower-production.repository";
import { TowerProductionService } from "@/modules/tower/application/tower-production.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const repository = new PrismaTowerProductionRepository();
const service = new TowerProductionService(repository);

const importTowersSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  companyId: z.string().min(1, "companyId is required"),
  siteId: z.string().optional().nullable(),
  data: z.array(z.record(z.unknown())).min(1, "data must be a non-empty array"),
});

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    console.log(
      `[API tower-production] GET request for projectId: "${projectId}"`,
    );
    if (!projectId || projectId === "undefined" || projectId === "null") {
      console.warn("[API tower-production] Missing or invalid projectId");
      return ApiResponse.badRequest("projectId is required");
    }

    const towers = await service.getTowers(projectId);
    console.log(
      `[API tower-production] Found ${towers.length} towers for project ${projectId}`,
    );

    return ApiResponse.json(towers);
  } catch (error: unknown) {
    console.error("[API tower-production] GET Error:", error);
    return handleApiError(
      error,
      "src/app/api/v1/tower-production/route.ts#GET",
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await req.json();

    const validation = importTowersSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(
        validation.error.issues.map((i) => i.message),
      );
    }

    const { projectId, companyId, siteId, data } = validation.data;

    const result = await service.importTowers(
      projectId,
      companyId,
      siteId || undefined,
      data,
    );
    return ApiResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-production/route.ts#POST",
    );
  }
}

export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await req.json();

    // Check if it's a bulk update
    if (body.items && Array.isArray(body.items)) {
      console.log(
        `[API tower-production] Bulk PATCH request for ${body.items.length} items`,
      );
      const result = await service.bulkUpdate(body.items);
      console.log(
        `[API tower-production] Bulk PATCH completed successfully for ${body.items.length} items`,
      );
      return ApiResponse.json(result);
    }

    const { id, updates } = body;

    if (!id) {
      return ApiResponse.badRequest("id is required");
    }

    const result = await service.updateTower(id, updates);
    return ApiResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-production/route.ts#PATCH",
    );
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.badRequest("id is required");
    }

    await service.deleteTower(id);
    return ApiResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-production/route.ts#DELETE",
    );
  }
}
