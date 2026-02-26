import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";

import { z } from "zod";

const repository = new PrismaWorkStageRepository();
const service = new WorkStageService(repository);

const syncStagesSchema = z.object({
  siteId: z.string().optional(),
  projectId: z.string().optional(),
}).refine(payload => data.siteId || data.projectId, {
  message: "Site ID or Project ID required"
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await req.json();
    
    const validation = syncStagesSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.badRequest(validation.error.issues[0].message);
    }

    const { siteId, projectId } = validation.data;

    const securityContext = {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    };

    // Sincronização via Service (DDD) com validação de escopo
    const results = await service.syncStages(
      { siteId, projectId },
      user.companyId || "",
      securityContext,
    );

    return ApiResponse.json({ success: true, results });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message && err.message.includes("Forbidden")) {
      return ApiResponse.forbidden(err.message);
    }
    return handleApiError(
      error,
      "src/app/api/v1/work_stages/sync/route.ts#POST",
    );
  }
}
