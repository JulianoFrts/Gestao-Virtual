import { NextRequest, NextResponse } from "next/server";
import { PrismaTowerActivityRepository } from "@/modules/tower/infrastructure/prisma-tower-activity.repository";
import { TowerActivityService } from "@/modules/tower/application/tower-activity.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

const repository = new PrismaTowerActivityRepository();
const service = new TowerActivityService(repository);

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId is required");
    }

    const hierarchy = await service.getHierarchy(projectId);
    return ApiResponse.json(hierarchy);
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-activity-goals/route.ts#GET",
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { projectId, companyId, data, single } = body;

    // Support single save or bulk import
    if (single) {
      const result = await service.saveGoal(body);
      return NextResponse.json(result);
    }

    if (!projectId || !companyId || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await service.importGoals(projectId, companyId, data);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { id, parentId, order } = body;

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const result = await service.moveGoal(id, parentId, order);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    await service.deleteGoal(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
