import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { PrismaProductionRepository } from "@/modules/production/infrastructure/prisma-production.repository";
import { ProductionService } from "@/modules/production/application/production.service";

const repository = new PrismaProductionRepository();
const service = new ProductionService(repository);

const scheduleSchema = z.object({
  towerId: z.string(),
  activityId: z.string(),
  plannedStart: z.string(), // Service converts to Date
  plannedEnd: z.string(),
  plannedQuantity: z.number().optional().nullable(),
  plannedHHH: z.number().optional().nullable(),
});

// POST - Define ou atualiza cronograma de atividade numa torre (elemento)
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
    const body = await request.json();
    const data = scheduleSchema.parse(body);

    const schedule = await service.saveSchedule(data, user);

    return ApiResponse.json(schedule, "Cronograma salvo com sucesso");
  } catch (error: any) {
    logger.error("Erro ao salvar cronograma", {
      error,
      source: "src/app/api/v1/production/schedule",
      userId: user?.id,
    });
    return handleApiError(error);
  }
}

/**
 * DELETE - Remove um agendamento específico ou em lote
 */
export async function DELETE(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const scope = searchParams.get("scope");
    const scheduleId = searchParams.get("scheduleId");

    if (scheduleId) {
      const targetDateStr = searchParams.get("targetDate");

      await service.removeSchedule(scheduleId, user, {
        targetDate: targetDateStr || undefined,
      });

      return ApiResponse.json(
        { count: 1 },
        targetDateStr
          ? "Agendamento dividido com sucesso"
          : "Agendamento removido",
      );
    }

    if (scope === "project_all") {
      const projectId = searchParams.get("projectId");
      const result = await service.removeSchedulesByScope(
        "project_all",
        { projectId },
        user,
      );
      return ApiResponse.json(result);
    }

    if (scope === "batch") {
      const projectId = searchParams.get("projectId");
      const activityId = searchParams.get("activityId");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      if (!startDate || !endDate)
        return ApiResponse.badRequest("Datas obrigatórias para batch delete");

      const result = await service.removeSchedulesByScope(
        "batch",
        {
          projectId,
          activityId,
          startDate,
          endDate,
        },
        user,
      );

      return ApiResponse.json(result);
    }

    return ApiResponse.badRequest("Parâmetros inválidos");
  } catch (error: any) {
    logger.error("Erro ao remover cronograma", {
      error,
      source: "src/app/api/v1/production/schedule",
      userId: user?.id,
    });
    return handleApiError(error);
  }
}

/**
 * GET - Obtém cronograma
 */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const towerId =
      searchParams.get("towerId") || searchParams.get("elementId");
    //const projectId = searchParams.get('projectId'); // Service supports project listing too if needed

    const schedules = await service.listSchedules(
      {
        elementId: towerId || undefined,
        //projectId: projectId || undefined
      },
      user,
    );

    return ApiResponse.json(schedules);
  } catch (error: any) {
    logger.error("Erro ao buscar cronogramas", {
      error,
      source: "src/app/api/v1/production/schedule",
      userId: user?.id,
    });
    return handleApiError(error);
  }
}
