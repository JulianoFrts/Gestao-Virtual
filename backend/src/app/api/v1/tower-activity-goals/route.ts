import { NextRequest, NextResponse } from "next/server";
import { PrismaTowerActivityRepository } from "@/modules/tower/infrastructure/prisma-tower-activity.repository";
import { TowerActivityService } from "@/modules/tower/application/tower-activity.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";

import { z } from "zod";

const repository = new PrismaTowerActivityRepository();
const workStageRepository = new PrismaWorkStageRepository();
const service = new TowerActivityService(repository, workStageRepository);

const saveGoalSchema = z.object({
  projectId: z.string().min(1),
  companyId: z.string().min(1),
  data: z.array(z.record(z.unknown())).optional(),
  single: z.boolean().optional(),
}).passthrough();

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
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { projectId, companyId, data, single } = validation.data;

    // Support single save or bulk import
    if (single) {
      // Destructure only the 'single' flag to avoid passing it to Prisma
      const { single: _, ...cleanData } = validation.data;
      const result = await service.saveGoal(cleanData as unknown);
      return NextResponse.json(result);
    }

    if (!projectId || !companyId || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: HTTP_STATUS.BAD_REQUEST /* BAD_REQUEST */ },
      );
    }

    const result = await service.importGoals(projectId, companyId, data);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: HTTP_STATUS.INTERNAL_ERROR /* INTERNAL_SERVER_ERROR */ });
  }
}

export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const body = await req.json();
    
    const validation = moveGoalSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { id, parentId, order } = validation.data;

    const result = await service.moveGoal(id, parentId || undefined, order);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: HTTP_STATUS.INTERNAL_ERROR /* INTERNAL_SERVER_ERROR */ });
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: HTTP_STATUS.BAD_REQUEST /* BAD_REQUEST */ });

    await service.deleteGoal(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: HTTP_STATUS.INTERNAL_ERROR /* INTERNAL_SERVER_ERROR */ });
  }
}
