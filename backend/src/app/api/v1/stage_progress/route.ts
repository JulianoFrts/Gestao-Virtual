import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";
import { PrismaWorkStageRepository } from "@/modules/work-stages/domain/work-stage.repository";

const service = new WorkStageService(new PrismaWorkStageRepository());

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const {
      stage_id,
      actual_percentage,
      planned_percentage,
      notes,
      recorded_at,
    } = body;

    const progress = await service.upsertProgress({
      id: body.id,
      stageId: stage_id,
      actualPercentage: actual_percentage,
      recordedDate: recorded_at ? new Date(recorded_at) : undefined,
      notes,
    });

    return ApiResponse.json(progress);
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/stage_progress/route.ts#POST");
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("stage_id");

    const progress = await service.listProgress(stageId || undefined);
    return ApiResponse.json(progress);
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/stage_progress/route.ts#GET");
  }
}
