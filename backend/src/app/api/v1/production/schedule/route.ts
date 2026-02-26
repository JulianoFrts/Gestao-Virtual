import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { ProductionFactory } from "@/modules/production/application/production.factory";
import type { Session } from "next-auth";

const service = ProductionFactory.create();

const scheduleSchema = z.object({
  towerId: z.string(),
  activityId: z.string(),
  plannedStart: z.string(), // Service converts to Date
  plannedEnd: z.string(),
  plannedQuantity: z.number().optional().nullable(),
  plannedHhh: z.number().optional().nullable(),
});

type ScheduleInput = z.infer<typeof scheduleSchema>;

// POST - Define ou atualiza cronograma de atividade numa torre (elemento)
export async function POST(request: NextRequest): Promise<Response> {
  let user: Session["user"] | undefined;
  try {
    user = await requireAuth();
    const body = await request.json();
    logger.debug("[schedule] POST Body:", JSON.stringify(body, null, 2));

    let scheduleData: ScheduleInput;
    try {
      scheduleData = scheduleSchema.parse(body);
    } catch (zodError: unknown) {
      const error = zodError as z.ZodError;
      console.error("[schedule] Validation Error:", error.errors);
      return ApiResponse.badRequest(
        "Erro de validação no agendamento",
        error.errors,
      );
    }

    const schedule = await service.saveSchedule(scheduleData, {
      ...user,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    } as unknown);

    return ApiResponse.json(schedule, "Cronograma salvo com sucesso");
  } catch (error: unknown) {
    logger.error("Erro ao salvar cronograma", {
      error,
      source: "src/app/api/v1/production/schedule",
      userId: user?.id,
    });
    return handleApiError(
      error,
      "src/app/api/v1/production/schedule/route.ts#POST",
    );
  }
}

/**
 * DELETE - Remove um agendamento específico ou em lote
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  let user: Session["user"] | undefined;
  try {
    user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const scheduleId = searchParams.get("scheduleId");

    if (scheduleId) {
      return await handleDeleteSingle(scheduleId, searchParams, user);
    }

    const scope = searchParams.get("scope");
    if (scope === "project_all") {
      return await handleDeleteProjectAll(searchParams, user);
    }

    if (scope === "batch") {
      return await handleDeleteBatch(searchParams, user);
    }

    return ApiResponse.badRequest("Parâmetros inválidos");
  } catch (error: unknown) {
    logger.error("Erro ao remover cronograma", {
      error,
      source: "src/app/api/v1/production/schedule",
      userId: user?.id,
    });
    return handleApiError(error, "src/app/api/v1/production/schedule/route.ts#DELETE");
  }
}

async function handleDeleteSingle(scheduleId: string, searchParams: URLSearchParams, user: Session["user"]): Promise<Response> {
  const targetDateStr = searchParams.get("targetDate");
  await service.removeSchedule(scheduleId, user, { targetDate: targetDateStr || undefined });
  return ApiResponse.json({ count: 1 }, targetDateStr ? "Agendamento dividido com sucesso" : "Agendamento removido");
}

async function handleDeleteProjectAll(searchParams: URLSearchParams, user: Session["user"]): Promise<Response> {
  const projectId = searchParams.get("projectId");
  const result = await service.removeSchedulesByScope("project_all", { projectId }, user);
  return ApiResponse.json(result);
}

async function handleDeleteBatch(searchParams: URLSearchParams, user: Session["user"]): Promise<Response> {
  const projectId = searchParams.get("projectId");
  const activityId = searchParams.get("activityId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) return ApiResponse.badRequest("Datas obrigatórias para batch delete");

  const result = await service.removeSchedulesByScope("batch", { projectId, activityId, startDate, endDate }, user);
  return ApiResponse.json(result);
}

/**
 * GET - Obtém cronograma
 */
export async function GET(request: NextRequest): Promise<Response> {
  let user: Session["user"] | undefined;
  try {
    user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const towerId =
      searchParams.get("towerId") || searchParams.get("elementId");

    const schedules = await service.listSchedules(
      {
        elementId: towerId || undefined,
        //projectId: projectId || undefined
      },
      {
        ...user,
        hierarchyLevel: user.hierarchyLevel,
        permissions: (user.permissions as Record<string, boolean>),
      } as unknown,
    );

    return ApiResponse.json(schedules);
  } catch (error: unknown) {
    logger.error("Erro ao buscar cronogramas", {
      error,
      source: "src/app/api/v1/production/schedule",
      userId: user?.id,
    });
    return handleApiError(
      error,
      "src/app/api/v1/production/schedule/route.ts#GET",
    );
  }
}
