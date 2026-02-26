import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { WorkStageProgressService } from "@/modules/work-stages/application/work-stage-progress.service";
import { PrismaWorkStageProgressRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage-progress.repository";
import { cacheService } from "@/services/cacheService";

import { z } from "zod";

const service = new WorkStageProgressService(
  new PrismaWorkStageProgressRepository(cacheService),
);

const upsertProgressSchema = z.object({
  id: z.string().optional(),
  stage_id: z.string().min(1, "ID da etapa é obrigatório"),
  actual_percentage: z.number().min(0).max(100),
  notes: z.string().optional().nullable(),
  recorded_at: z.string().optional().nullable(),
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await req.json();
    
    const validation = upsertProgressSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { id, stage_id, actual_percentage, notes, recorded_at } = validation.data;
    const progress = await service.upsert({
      id,
      stageId: stage_id,
      actualPercentage: actual_percentage,
      recordedDate: recorded_at ? new Date(recorded_at) : undefined,
      notes,
    });

    return ApiResponse.json(progress);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/stage_progress/route.ts#POST");
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("stage_id");

    const progress = await service.list(stageId || undefined);
    return ApiResponse.json(progress);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/stage_progress/route.ts#GET");
  }
}
