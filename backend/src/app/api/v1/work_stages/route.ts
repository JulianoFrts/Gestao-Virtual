import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";
import { PrismaWorkStageRepository } from "@/modules/work-stages/domain/work-stage.repository";

// DI Manual
const workStageService = new WorkStageService(new PrismaWorkStageRepository());

/**
 * GET: Fetch work stages for a site/project
 * Endpoint: GET /api/v1/work_stages
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const projectId = searchParams.get("projectId");
    const companyId = searchParams.get("companyId");
    const linkedOnly = searchParams.get("linkedOnly") === "true";

    const stages = await workStageService.findAll({
      siteId,
      projectId,
      companyId,
      linkedOnly
    });

    return ApiResponse.json(stages);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/work_stages/route.ts#GET");
  }
}

/**
 * POST: Create a new work stage
 * Endpoint: POST /api/v1/work_stages
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    // O Service agora cuida da normalização, validação de UUID e existência
    const stage = await workStageService.createStage(body);

    return ApiResponse.created(stage, "Etapa criada com sucesso");
  } catch (error: any) {
    // Tratamento de mensagens específicas lançadas pelo Service
    if (error.message === "Name is required" || error.message === "Site ID or Project ID is required") {
      return ApiResponse.badRequest(error.message);
    }
    return handleApiError(error, "src/app/api/v1/work_stages/route.ts#POST");
  }
}
