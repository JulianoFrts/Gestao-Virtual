import { logger } from "@/lib/utils/logger";
import {
  ProductionProgressRepository,
  ProductionProgress as IProductionProgress,
} from "../domain/production.repository";
import {
  ProductionSchedule,
  ProductionScheduleRepository,
} from "../domain/production-schedule.repository";
import { ProjectElementRepository } from "../domain/project-element.repository";
import { TimeProvider } from "@/lib/utils/time-provider";

export class ProductionScheduleService {
  constructor(
    private readonly scheduleRepository: ProductionScheduleRepository,
    private readonly progressRepository: ProductionProgressRepository,
    private readonly elementRepository: ProjectElementRepository,
    private readonly timeProvider: TimeProvider,
  ) {}

  async saveSchedule(
    data: Record<string, unknown>,
    user: {
      id: string;
      role: string;
      companyId?: string | null;
      hierarchyLevel?: number;
      permissions?: Record<string, boolean>;
    },
  ): Promise<ProductionSchedule> {
    if (
      !data.towerId ||
      data.towerId === "undefined" ||
      !data.activityId ||
      data.activityId === "undefined"
    ) {
      throw new Error("ID da Torre ou da Atividade inválido para agendamento.");
    }

    // Garantir que o elemento existe no repositório (Materialização se for virtual)
    const towerId = data.towerId as string;
    const activityId = data.activityId as string;

    const effectiveId =
      await this.elementRepository.materializeVirtualElement(towerId);
    const effectiveElementId = effectiveId || towerId;

    const existing = await this.scheduleRepository.findScheduleByElement(
      effectiveElementId,
      activityId,
    );

    if (activityId.startsWith("custom-")) {
      throw new Error(
        "Agendamento falhou: Esta etapa não está vinculada a uma atividade real do catálogo.",
      );
    }

    const payload = {
      id: existing?.id,
      elementId: effectiveElementId,
      activityId: activityId,
      plannedStart: new Date(data.plannedStart as string),
      plannedEnd: new Date(data.plannedEnd as string),
      plannedQuantity: data.plannedQuantity as number,
      plannedHhh: data.plannedHhh as number,
      createdBy: existing ? undefined : user.id, // Fixed: createdBy matches Prisma model
    };

    logger.debug("[saveSchedule] Payload:", JSON.stringify(payload, null, 2));

    return this.scheduleRepository.saveSchedule(payload);
  }

  async listSchedules(
    params: { elementId?: string; projectId?: string },
    user: {
      id: string;
      role: string;
      companyId?: string | null;
      hierarchyLevel?: number;
      permissions?: Record<string, boolean>;
    },
  ): Promise<ProductionSchedule[]> {
    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(
      user.role,
      user.hierarchyLevel,
      user.permissions,
    );

    return this.scheduleRepository.findSchedulesByScope({
      elementId: params.elementId ?? undefined,
      projectId: params.projectId,
      companyId: isAdmin ? undefined : user.companyId || undefined,
    });
  }

  async removeSchedule(
    scheduleId: string,
    user: {
      id: string;
      role: string;
      companyId?: string | null;
      hierarchyLevel?: number;
      permissions?: Record<string, boolean>;
    },
    options?: { targetDate?: string },
  ): Promise<void> {
    const existing = await this.scheduleRepository.findScheduleById(scheduleId);
    if (!existing) throw new Error("Agendamento não encontrado");

    if (options?.targetDate) {
      const targetDateStr = options.targetDate;
      const targetDate = new Date(targetDateStr);

      if (
        existing.plannedStart.toISOString().split("T")[0] ===
        existing.plannedEnd.toISOString().split("T")[0]
      ) {
        return this.scheduleRepository.deleteSchedule(scheduleId);
      }

      await this.performScheduleSplit(scheduleId, existing, targetDate);
    } else {
      return this.scheduleRepository.deleteSchedule(scheduleId);
    }
  }

  async removeSchedulesByScope(
    scope: "project_all" | "batch",
    params: Record<string, unknown>,
    user: {
      id: string;
      role: string;
      companyId?: string | null;
      hierarchyLevel?: number;
      permissions?: Record<string, boolean>;
    },
  ): Promise<{ count: number; skipped?: number }> {
    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(
      user.role,
      user.hierarchyLevel,
      user.permissions,
    );

    const candidates = await this.findRemovalCandidates(
      scope,
      params,
      isAdmin ? undefined : user.companyId,
    );
    if (candidates.length === 0) return { count: 0 /* literal */ };

    const validIds = await this.filterNonExecutedSchedules(candidates);
    if (validIds.length === 0) return { count: 0 /* literal */, skipped: candidates.length };

    const count = await this.scheduleRepository.deleteSchedulesBatch(validIds);
    return { count, skipped: candidates.length - count };
  }

  private async findRemovalCandidates(
    scope: string,
    params: Record<string, unknown>,
    companyId?: string | null,
  ): Promise<ProductionSchedule[]> {
    let queryParams: Record<string, unknown> = { companyId };

    if (scope === "project_all") {
      queryParams.projectId = params.projectId;
    } else if (scope === "batch") {
      queryParams = {
        ...queryParams,
        projectId: params.projectId as string,
        activityId: params.activityId as string,
        dateRange: {
          start: new Date(params.startDate as string),
          end: new Date(params.endDate as string),
        },
      };
    }

    return this.scheduleRepository.findSchedulesByScope(queryParams);
  }

  private async filterNonExecutedSchedules(
    candidates: ProductionSchedule[],
  ): Promise<string[]> {
    const validIds: string[] = [];
    for (const sched of candidates) {
      const hasExec = await this.hasExecution(
        sched.elementId,
        sched.activityId,
      );
      if (!hasExec && sched.id) {
        validIds.push(sched.id);
      }
    }
    return validIds;
  }

  async hasExecution(elementId: string, activityId: string): Promise<boolean> {
    const progress = await this.progressRepository.findByElement(elementId);
    const specific = progress.find(
      (p: IProductionProgress) => p.activityId === activityId,
    );
    return !!(
      specific &&
      (specific.currentStatus === "IN_PROGRESS" ||
        specific.currentStatus === "FINISHED")
    );
  }

  private async performScheduleSplit(
    scheduleId: string,
    existing: ProductionSchedule,
    targetDate: Date,
  ): Promise<void> {
    const part1End = new Date(targetDate);
    part1End.setDate(part1End.getDate() - 1);
    const part2Start = new Date(targetDate);
    part2Start.setDate(part2Start.getDate() + 1);

    await this.scheduleRepository.splitSchedule(
      scheduleId,
      { plannedEnd: part1End },
      {
        elementId: existing.elementId,
        activityId: existing.activityId,
        plannedStart: part2Start,
        plannedEnd: existing.plannedEnd,
        plannedQuantity: existing.plannedQuantity,
        plannedHhh: existing.plannedHhh,
        createdById: existing.createdById,
      },
    );
  }
}
