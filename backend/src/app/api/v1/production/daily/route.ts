import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { ProductionFactory } from "@/modules/production/application/production.factory";
import { HTTP_STATUS } from "@/lib/constants";

const service = ProductionFactory.create();

const dailyProductionSchema = z.object({
  towerId: z.string(),
  activityId: z.string(),
  workDate: z.string(),
  teamId: z.string().optional().nullable(),
  workersCount: z.number().int().min(0),
  hoursWorked: z.number().min(0),
  producedQuantity: z.number().optional().nullable(),
  plannedQuantity: z.number().optional().nullable(),
});

/**
 * POST - Registra produção diária (HHH e quantidade) no JSON unificado
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = dailyProductionSchema.parse(body);

    // O multitenancy já é verificado dentro do service se passarmos o contexto,
    // ou podemos delegar a verificação de permissão.
    // Para manter compatibilidade com as regras atuais do controller:
    const elementCompanyId = await service.getElementCompanyId(data.towerId);
    if (!elementCompanyId)
      return ApiResponse.notFound("Elemento não encontrado");

    const { isUserAdmin } = await import("@/lib/auth/session");
    if (
      !isUserAdmin(
        user.role,
        (user as any).hierarchyLevel,
        (user as any).permissions,
      ) &&
      elementCompanyId !== user.companyId
    ) {
      return ApiResponse.forbidden(
        "Você não tem permissão para registrar produção deste elemento",
      );
    }

    const elementProjectId =
      body.projectId || (await service.getElementProjectId(data.towerId)) || "";

    const updated = await service.recordDailyProduction({
      towerId: data.towerId, // Map to elementId if needed by DTO, wait, DTO expects elementId
      elementId: data.towerId,
      activityId: data.activityId,
      projectId: elementProjectId,
      date: data.workDate,
      data: {
        teamId: data.teamId,
        workersCount: data.workersCount,
        hoursWorked: data.hoursWorked,
        producedQuantity: data.producedQuantity,
        plannedQuantity: data.plannedQuantity,
      },
      userId: user.id,
    } as any);

    return ApiResponse.json(updated, "Produção diária registrada com sucesso");
  } catch (error: any) {
    logger.error("Erro ao registrar produção diária", {
      error,
      source: "src/app/api/v1/production/daily",
    });
    return handleApiError(
      error,
      "src/app/api/v1/production/daily/route.ts#POST",
    );
  }
}

/**
 * GET - Lista produção diária a partir do JSON unificado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const towerId =
      searchParams.get("towerId") || searchParams.get("elementId");
    const activityId = searchParams.get("activityId") || undefined;

    if (!towerId) {
      return ApiResponse.badRequest("towerId/elementId é obrigatório");
    }

    const result = await service.listDailyProduction(towerId, activityId, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: (user as any).hierarchyLevel,
      permissions: (user as any).permissions,
    });

    return ApiResponse.json(result);
  } catch (error: any) {
    if (error.message.includes("Forbidden"))
      return ApiResponse.forbidden(error.message);
    logger.error("Erro ao listar produção diária", {
      error,
      source: "src/app/api/v1/production/daily",
    });
    return handleApiError(
      error,
      "src/app/api/v1/production/daily/route.ts#GET",
    );
  }
}
