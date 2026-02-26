import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";
import { PrismaWorkStageRepository } from "@/modules/work-stages/infrastructure/prisma-work-stage.repository";

import { z } from "zod";

// DI Manual
const workStageService = new WorkStageService(new PrismaWorkStageRepository());

const createWorkStageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  siteId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  productionActivityId: z.string().optional().nullable(),
  displayOrder: z.number().int().optional(),
  weight: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(payload => data.siteId || data.projectId, {
  message: "Site ID or Project ID is required",
});

/**
 * GET: Fetch work stages for a site/project
 * Endpoint: GET /api/v1/work_stages
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const projectId = searchParams.get("projectId");
    const companyId = searchParams.get("companyId");
    const linkedOnly = searchParams.get("linkedOnly") === "true";

    const stages = await workStageService.findAll(
      {
        siteId,
        projectId,
        companyId,
        linkedOnly,
      },
      {
        role: user.role,
        companyId: user.companyId,
        hierarchyLevel: user.hierarchyLevel,
        permissions: (user.permissions as Record<string, boolean>),
      },
    );

    return ApiResponse.json(stages);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/work_stages/route.ts#GET");
  }
}

/**
 * POST: Create a new work stage
 * Endpoint: POST /api/v1/work_stages
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const validation = createWorkStageSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const stage = await workStageService.createStage(validation.data as unknown, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    return ApiResponse.created(stage, "Etapa criada com sucesso");
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message && err.message.includes("Forbidden")) {
      return ApiResponse.forbidden(err.message);
    }
    if (
      err.message === "Name is required" ||
      err.message === "Site ID or Project ID is required"
    ) {
      return ApiResponse.badRequest(err.message);
    }
    return handleApiError(error, "src/app/api/v1/work_stages/route.ts#POST");
  }
}
