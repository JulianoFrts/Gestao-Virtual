import { ProductionRepository } from "../domain/production.repository";

export class ProductionScheduleService {
  constructor(private readonly repository: ProductionRepository) {}

  async saveSchedule(
    data: any,
    user: { id: string; role: string; companyId?: string | null },
  ) {
    const existing = await this.repository.findScheduleByElement(
      data.towerId,
      data.activityId,
    );

    const payload = {
      id: existing?.id,
      elementId: data.towerId,
      activityId: data.activityId,
      plannedStart: new Date(data.plannedStart),
      plannedEnd: new Date(data.plannedEnd),
      plannedQuantity: data.plannedQuantity,
      plannedHHH: data.plannedHHH,
      createdById: existing ? undefined : user.id,
    };

    return this.repository.saveSchedule(payload);
  }

  async listSchedules(
    params: { elementId?: string; projectId?: string },
    user: { id: string; role: string; companyId?: string | null },
  ) {
    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(user.role);

    return this.repository.findSchedulesByScope({
      elementId: params.elementId ?? undefined,
      projectId: params.projectId,
      companyId: isAdmin ? undefined : user.companyId || undefined,
    });
  }

  async removeSchedule(
    scheduleId: string,
    user: { id: string; role: string; companyId?: string | null },
    options?: { targetDate?: string },
  ) {
    const existing = await this.repository.findScheduleById(scheduleId);
    if (!existing) throw new Error("Agendamento não encontrado");

    if (options?.targetDate) {
      const targetDateStr = options.targetDate;
      const targetDate = new Date(targetDateStr);

      if (
        existing.plannedStart.toISOString().split("T")[0] ===
        existing.plannedEnd.toISOString().split("T")[0]
      ) {
        return this.repository.deleteSchedule(scheduleId);
      }

      await this.performScheduleSplit(scheduleId, existing, targetDate);
    } else {
      return this.repository.deleteSchedule(scheduleId);
    }
  }

  async removeSchedulesByScope(
    scope: "project_all" | "batch",
    params: any,
    user: { id: string; role: string; companyId?: string | null },
  ) {
    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(user.role);

    const candidates = await this.findRemovalCandidates(
      scope,
      params,
      isAdmin ? undefined : user.companyId,
    );
    if (candidates.length === 0) return { count: 0 };

    const validIds = await this.filterNonExecutedSchedules(candidates);
    if (validIds.length === 0) return { count: 0, skipped: candidates.length };

    const count = await this.repository.deleteSchedulesBatch(validIds);
    return { count, skipped: candidates.length - count };
  }

  private async findRemovalCandidates(
    scope: string,
    params: any,
    companyId?: string | null,
  ): Promise<any[]> {
    let queryParams: any = { companyId };

    if (scope === "project_all") {
      queryParams.projectId = params.projectId;
    } else if (scope === "batch") {
      queryParams = {
        ...queryParams,
        projectId: params.projectId,
        activityId: params.activityId,
        dateRange: {
          start: new Date(params.startDate),
          end: new Date(params.endDate),
        },
      };
    }

    return this.repository.findSchedulesByScope(queryParams);
  }

  private async filterNonExecutedSchedules(candidates: any[]): Promise<string[]> {
    const validIds: string[] = [];
    for (const sched of candidates) {
      const hasExec = await this.hasExecution(sched.elementId, sched.activityId);
      if (!hasExec) {
        validIds.push(sched.id);
      }
    }
    return validIds;
  }

  async hasExecution(elementId: string, activityId: string): Promise<boolean> {
    const progress = await this.repository.findByElement(elementId);
    const specific = progress.find((p) => p.activityId === activityId);
    return !!(
      specific &&
      (specific.currentStatus === "IN_PROGRESS" ||
        specific.currentStatus === "FINISHED")
    );
  }

  private async performScheduleSplit(
    scheduleId: string,
    existing: any,
    targetDate: Date,
  ) {
    const part1End = new Date(targetDate);
    part1End.setDate(part1End.getDate() - 1);
    const part2Start = new Date(targetDate);
    part2Start.setDate(part2Start.getDate() + 1);

    await this.repository.splitSchedule(
      scheduleId,
      { plannedEnd: part1End },
      {
        elementId: existing.elementId,
        activityId: existing.activityId,
        plannedStart: part2Start,
        plannedEnd: existing.plannedEnd,
        plannedQuantity: existing.plannedQuantity,
        plannedHHH: existing.plannedHHH,
        createdById: existing.createdById,
      },
    );
  }
}
