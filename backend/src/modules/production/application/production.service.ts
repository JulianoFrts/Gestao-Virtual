import {
  ProductionRepository,
  ActivityStatus,
} from "../domain/production.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import { ProductionProgressService } from "./production-progress.service";
import { ProductionScheduleService } from "./production-schedule.service";
import { DailyProductionService } from "./daily-production.service";

export class ProductionService {
  private readonly progressService: ProductionProgressService;
  private readonly scheduleService: ProductionScheduleService;
  private readonly dailyService: DailyProductionService;

  constructor(private readonly repository: ProductionRepository) {
    this.progressService = new ProductionProgressService(repository);
    this.scheduleService = new ProductionScheduleService(repository);
    this.dailyService = new DailyProductionService(repository);
  }

  // ==========================================
  // PROGRESS DELEGATION
  // ==========================================

  async getElementProgress(elementId: string): Promise<ProductionProgress[]> {
    return this.progressService.getElementProgress(elementId);
  }

  async listProjectProgress(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
  ): Promise<any[]> {
    return this.progressService.listProjectProgress(projectId, companyId, siteId);
  }

  async getLogsByElement(
    elementId: string,
    companyId?: string | null,
  ): Promise<any[]> {
    return this.progressService.getLogsByElement(elementId, companyId);
  }

  async getPendingLogs(companyId?: string | null): Promise<any[]> {
    return this.progressService.getPendingLogs(companyId);
  }

  async updateProgress(
    elementId: string,
    activityId: string,
    projectId: string | null | undefined,
    status: ActivityStatus,
    progress: number,
    metadata: any,
    userId: string,
    dates?: { start?: string | null; end?: string | null },
  ): Promise<ProductionProgress> {
    return this.progressService.updateProgress(
      elementId,
      activityId,
      projectId,
      status,
      progress,
      metadata,
      userId,
      dates,
    );
  }

  async approveLog(
    progressId: string,
    logTimestamp: string,
    approvedBy: string,
    userId: string,
  ): Promise<ProductionProgress> {
    return this.progressService.approveLog(
      progressId,
      logTimestamp,
      approvedBy,
      userId,
    );
  }

  // ==========================================
  // DAILY PRODUCTION DELEGATION
  // ==========================================

  async recordDailyProduction(
    elementId: string,
    activityId: string,
    projectId: string,
    date: string,
    data: any,
    userId: string,
  ): Promise<ProductionProgress> {
    return this.dailyService.recordDailyProduction(
      elementId,
      activityId,
      projectId,
      date,
      data,
      userId,
    );
  }

  async listDailyProduction(
    towerId: string,
    activityId?: string,
    user?: { role: string; companyId?: string | null },
  ) {
    return this.dailyService.listDailyProduction(towerId, activityId, user);
  }

  // ==========================================
  // SCHEDULE DELEGATION
  // ==========================================

  async saveSchedule(
    data: any,
    user: { id: string; role: string; companyId?: string | null },
  ) {
    return this.scheduleService.saveSchedule(data, user);
  }

  async listSchedules(
    params: { elementId?: string; projectId?: string },
    user: { id: string; role: string; companyId?: string | null },
  ) {
    return this.scheduleService.listSchedules(params, user);
  }

  async removeSchedule(
    scheduleId: string,
    user: { id: string; role: string; companyId?: string | null },
    options?: { targetDate?: string },
  ) {
    return this.scheduleService.removeSchedule(scheduleId, user, options);
  }

  async removeSchedulesByScope(
    scope: "project_all" | "batch",
    params: any,
    user: { id: string; role: string; companyId?: string | null },
  ) {
    return this.scheduleService.removeSchedulesByScope(scope, params, user);
  }

  // Deprecated Helper (Previously private, exposing just in case of weird usage, but mostly internal)
  async hasExecution(elementId: string, activityId: string): Promise<boolean> {
    return this.scheduleService.hasExecution(elementId, activityId);
  }

  async listIAPs() {
    return this.repository.findAllIAPs();
  }
}
