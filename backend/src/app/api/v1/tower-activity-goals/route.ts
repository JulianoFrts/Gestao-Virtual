import { NextRequest } from "next/server";
import { PrismaTowerActivityRepository } from "@/modules/tower/infrastructure/prisma-tower-activity.repository";
import { TowerActivityService } from "@/modules/tower/application/tower-activity.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
// Removed unused HTTP_STATUS import
import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";
import { z } from "zod";

const repository = new PrismaTowerActivityRepository();
const workStageRepository = new PrismaWorkStageRepository();
const service = new TowerActivityService(repository, workStageRepository);

const saveGoalSchema = z
  .object({
    projectId: z.string().min(1),
    companyId: z.string().min(1),
    data: z.array(z.record(z.unknown())).optional(),
    single: z.boolean().optional(),
  })
  .passthrough();

const moveGoalSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId is required");
    }

    const hierarchy = await service.getHierarchy(projectId);
    return ApiResponse.json(hierarchy);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-activity-goals/route.ts#GET",
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const body = await req.json();

    const validation = saveGoalSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(
        validation.error.issues.map((i) => i.message),
      );
    }

    const { projectId, companyId, data, single } = validation.data;

    // Support single save or bulk import
    if (single) {
      const { single: _, ...cleanData } = validation.data;
      const result = await service.saveGoal(cleanData as any);
      return ApiResponse.json(result);
    }

    if (!projectId || !companyId || !Array.isArray(data)) {
      return ApiResponse.badRequest("Missing required fields");
    }

    const result = await service.importGoals(projectId, companyId, data);
    return ApiResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-activity-goals/route.ts#POST",
    );
  }
}

export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const body = await req.json();

    const validation = moveGoalSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(
        validation.error.issues.map((i) => i.message),
      );
    }

    const { id, parentId, order } = validation.data;

    const result = await service.moveGoal(id, parentId || undefined, order);
    return ApiResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-activity-goals/route.ts#PATCH",
    );
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.badRequest("id is required");
    }

    await service.deleteGoal(id);
    return ApiResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-activity-goals/route.ts#DELETE",
    );
  }
}
