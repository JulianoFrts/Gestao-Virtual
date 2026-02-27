import { logger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, can } from "@/lib/auth/session";
import { z } from "zod";
import { ProductionFactory } from "@/modules/production/application/production.factory";

const service = ProductionFactory.create();

const updateStatusSchema = z.object({
  towerId: z.string().optional(),
  elementId: z.string().optional(),
  projectId: z.string().optional(),
  activityId: z.string(),
  status: z.enum(["PENDING", "IN_PROGRESS", "FINISHED"]),
  landStatus: z.enum(["FREE", "EMBARGO", "IMPEDIMENT"]).optional(),
  impedimentType: z
    .enum(["NONE", "OWNER", "CONTRACTOR", "PROJECT", "WORK"])
    .optional(),
  foremanName: z.string().optional().nullable(),
  progressPercent: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.any().optional(),
  teamIds: z.array(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
  approvalReason: z.string().optional().nullable(),
});

export const dynamic = "force-dynamic";

/**
 * HEAD - Health Check
 */
export async function HEAD(): Promise<Response> {
  return ApiResponse.noContent();
}

/**
 * GET - Lista o status de atividades das torres de um projeto
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");
    const requestedCompanyId = searchParams.get("companyId");

    const siteId = searchParams.get("siteId");

    // Pagination parameters
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    let skip: number | undefined;
    let take: number | undefined;

    if (pageParam && limitParam) {
      const page = parseInt(pageParam, 10);
      const limit = parseInt(limitParam, 10);
      if (!isNaN(page) && !isNaN(limit)) {
        take = limit;
        skip = (page > 0 ? page - 1 : 0) * limit;
      }
    }

    // Determinar empresa para filtro (Multitenancy)
    const isAdmin = await can("production.view_all_scopes");

    let companyIdFilter = user.companyId;

    // Limpar companyId se for string 'undefined', 'null' ou vazia
    const effectiveRequestedCompanyId =
      requestedCompanyId === "undefined" ||
      requestedCompanyId === "null" ||
      !requestedCompanyId
        ? undefined
        : requestedCompanyId;

    if (isAdmin) {
      if (effectiveRequestedCompanyId === "all") {
        companyIdFilter = null;
      } else if (effectiveRequestedCompanyId) {
        companyIdFilter = effectiveRequestedCompanyId;
      } else {
        // Admins (TI_SOFTWARE e acima) acessam tudo se não filtrar
        companyIdFilter = null;
      }
    }

    const towers = await service.listProjectProgress(
      projectId || "all",
      companyIdFilter,
      siteId || undefined,
      skip,
      take,
    );

    return ApiResponse.json(towers);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/production/tower-status/route.ts#GET",
    );
  }
}

/**
 * POST - Atualiza o status de uma atividade em um elemento (anteriormente torre)
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();

    if (!(await can("production.canRegisterAdvance"))) {
      return ApiResponse.forbidden(
        "Sem permissão para registrar avanço de produção",
      );
    }

    const body = await request.json();
    logger.debug("[tower-status] POST Body:", JSON.stringify(body, null, 2));

    let validatedData;
    try {
      validatedData = updateStatusSchema.parse(body);
    } catch (zodError: unknown) {
      console.error("[tower-status] Validation Error:", zodError.errors);
      return ApiResponse.badRequest(
        "Erro de validação dos dados",
        zodError.errors,
      );
    }

    const {
      towerId,
      elementId,
      activityId,
      status,
      foremanName,
      progressPercent,
      startDate,
      endDate,
      notes,
      metadata,
      projectId: bodyProjectId,
    } = validatedData;

    const finalElementId = elementId || towerId;
    if (!finalElementId) {
      return ApiResponse.badRequest(
        "ID do elemento (elementId ou towerId) é obrigatório",
      );
    }

    const progress = await service.updateProgress({
      elementId: finalElementId,
      activityId,
      projectId: bodyProjectId, // Pass if provided, service will look up if null
      status,
      progress: progressPercent || 0,
      metadata: { ...((metadata as unknown) || {}), foremanName, notes },
      userId: user.id,
      dates: { start: startDate, end: endDate },
    });

    return ApiResponse.json(progress, "Status atualizado com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/production/tower-status/route.ts#POST",
    );
  }
}
