import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";

/**
 * GET /api/v1/gantt
 * Retorna a estrutura de EAP (WBS) + dados de cronograma para visualização de Gantt
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId é obrigatório");
    }

    // 1. Buscar todas as etapas do projeto (com hierarquia)
    const stages = await prisma.workStage.findMany({
      where: {
        OR: [
          { projectId },
          { site: { projectId } },
        ],
      },
      include: {
        progress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        productionActivity: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    // 2. Buscar cronograma de atividades (datas planejadas)
    const schedules = await prisma.activitySchedule.findMany({
      where: {
        element: { projectId },
      },
      select: {
        activityId: true,
        plannedStart: true,
        plannedEnd: true,
        plannedQuantity: true,
        plannedHHH: true,
      },
    });

    // Agrupar schedules por activityId (pegar min/max para datas agregadas)
    const scheduleMap = new Map<string, { start: Date; end: Date; quantity: number; hhh: number }>();
    for (const sched of schedules) {
      const existing = scheduleMap.get(sched.activityId);
      const start = new Date(sched.plannedStart);
      const end = new Date(sched.plannedEnd);
      const qty = Number(sched.plannedQuantity || 0);
      const hhh = Number(sched.plannedHHH || 0);

      if (!existing) {
        scheduleMap.set(sched.activityId, { start, end, quantity: qty, hhh });
      } else {
        // Agregar: menor start, maior end, somar quantidades
        scheduleMap.set(sched.activityId, {
          start: start < existing.start ? start : existing.start,
          end: end > existing.end ? end : existing.end,
          quantity: existing.quantity + qty,
          hhh: existing.hhh + hhh,
        });
      }
    }

    // 3. Montar estrutura de árvore (EAP)
    type GanttNode = {
      id: string;
      name: string;
      parentId: string | null;
      categoryName: string | null;
      weight: number;
      progress: number;
      plannedStart: string | null;
      plannedEnd: string | null;
      plannedQuantity: number;
      plannedHHH: number;
      children: GanttNode[];
    };

    const nodeMap = new Map<string, GanttNode>();
    const roots: GanttNode[] = [];

    for (const stage of stages) {
      const latestProgress = stage.progress?.[0];
      const activityId = stage.productionActivityId;
      const schedule = activityId ? scheduleMap.get(activityId) : undefined;

      const node: GanttNode = {
        id: stage.id,
        name: stage.name,
        parentId: stage.parentId,
        categoryName: stage.productionActivity?.category?.name || null,
        weight: Number(stage.weight || 1),
        progress: Number(latestProgress?.actualPercentage || 0),
        plannedStart: schedule?.start?.toISOString() || null,
        plannedEnd: schedule?.end?.toISOString() || null,
        plannedQuantity: schedule?.quantity || 0,
        plannedHHH: schedule?.hhh || 0,
        children: [],
      };

      nodeMap.set(stage.id, node);
    }

    // Construir hierarquia
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // 4. Calcular progresso agregado (bottom-up) para nós pai
    function calculateAggregatedProgress(node: GanttNode): number {
      if (node.children.length === 0) {
        return node.progress;
      }

      let totalWeight = 0;
      let weightedProgress = 0;

      for (const child of node.children) {
        const childProgress = calculateAggregatedProgress(child);
        totalWeight += child.weight;
        weightedProgress += child.weight * childProgress;
      }

      if (totalWeight === 0) return 0;
      node.progress = weightedProgress / totalWeight;
      return node.progress;
    }

    for (const root of roots) {
      calculateAggregatedProgress(root);
    }

    return ApiResponse.json({
      projectId,
      stages: roots,
      totalStages: stages.length,
    });
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/gantt/route.ts#GET");
  }
}
