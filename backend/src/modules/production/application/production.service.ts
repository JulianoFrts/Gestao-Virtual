import { ProductionProgressRepository } from "../domain/production.repository";
import { ProjectElementRepository } from "../domain/project-element.repository";
import { ProductionSyncRepository } from "../domain/production-sync.repository";
import { ProductionScheduleRepository } from "../domain/production-schedule.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import {
  ProductionProgressService,
  UpdateProductionProgressDTO,
} from "./production-progress.service";
import { ProductionScheduleService } from "./production-schedule.service";
import { DailyProductionService } from "./daily-production.service";
import { RecordDailyProductionDTO } from "./dtos/record-daily-production.dto";
import { SystemTimeProvider } from "@/lib/utils/time-provider";

// Novos Repositórios (Divisão SRP)
import { ProductionCatalogueRepository } from "../domain/production-catalogue.repository";

export class ProductionService {
  public readonly progressService: ProductionProgressService;
  private readonly scheduleService: ProductionScheduleService;
  private readonly dailyService: DailyProductionService;

  constructor(
    private readonly progressRepository: ProductionProgressRepository,
    private readonly elementRepository: ProjectElementRepository,
    private readonly syncRepository: ProductionSyncRepository,
    private readonly scheduleRepository: ProductionScheduleRepository,
    private readonly catalogueRepository: ProductionCatalogueRepository,
  ) {
    const timeProvider = new SystemTimeProvider();
    this.progressService = new ProductionProgressService(
      progressRepository,
      elementRepository,
      syncRepository,
      scheduleRepository,
      timeProvider,
    );
    this.scheduleService = new ProductionScheduleService(
      scheduleRepository,
      progressRepository,
      elementRepository,
      timeProvider,
    );
    this.dailyService = new DailyProductionService(
      progressRepository,
      elementRepository,
      timeProvider,
    );
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
    skip?: number,
    take?: number,
  ): Promise<
    import("./dtos/production-progress.dto").ElementProgressResponse[]
  > {
    return this.progressService.listProjectProgress(
      projectId,
      companyId,
      siteId,
      skip,
      take,
    );
  }

  async getLogsByElement(
    elementId: string,
  ): Promise<import("./dtos/production-progress.dto").ProductionLogDTO[]> {
    return this.progressService.getLogsByElement(elementId);
  }

  async getPendingLogs(
    companyId?: string | null,
  ): Promise<import("./dtos/production-progress.dto").ProductionLogDTO[]> {
    return this.progressService.getPendingLogs(companyId);
  }

  async updateProgress(
    dto: UpdateProductionProgressDTO,
  ): Promise<
    import("../domain/production-progress.entity").ProductionProgress
  > {
    return this.progressService.updateProgress(dto);
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
    dto: RecordDailyProductionDTO,
  ): Promise<ProductionProgress> {
    return this.dailyService.recordDailyProduction(dto);
  }

  async listDailyProduction(
    towerId: string,
    activityId?: string,
    user?: { role: string; companyId?: string | null },
  ): Promise<import("./daily-production.service").DailyProductionListItem[]> {
    return this.dailyService.listDailyProduction(towerId, activityId, user);
  }

  // ==========================================
  // SCHEDULE DELEGATION
  // ==========================================

  async saveSchedule(
    data: Record<string, unknown>,
    user: { id: string; role: string; companyId?: string | null },
  ): Promise<
    import("../domain/production-schedule.repository").ProductionSchedule
  > {
    return this.scheduleService.saveSchedule(data, user);
  }

  async listSchedules(
    params: { elementId?: string; projectId?: string },
    user: { id: string; role: string; companyId?: string | null },
  ): Promise<
    import("../domain/production-schedule.repository").ProductionSchedule[]
  > {
    return this.scheduleService.listSchedules(params, user);
  }

  async removeSchedule(
    scheduleId: string,
    user: { id: string; role: string; companyId?: string | null },
    options?: { targetDate?: string },
  ): Promise<void> {
    return this.scheduleService.removeSchedule(scheduleId, user, options);
  }

  async removeSchedulesByScope(
    scope: "project_all" | "batch",
    params: Record<string, unknown>,
    user: { id: string; role: string; companyId?: string | null },
  ): Promise<{ count: number; skipped?: number }> {
    return this.scheduleService.removeSchedulesByScope(scope, params, user);
  }

  // Deprecated Helper (Previously private, exposing just in case of weird usage, but mostly internal)
  async hasExecution(elementId: string, activityId: string): Promise<boolean> {
    return this.scheduleService.hasExecution(elementId, activityId);
  }

  async listIAPs(): Promise<
    import("../domain/production-catalogue.repository").ProductionIAP[]
  > {
    return this.catalogueRepository.findAllIAPs();
  }

  // ==========================================
  // ELEMENT METADATA HELPERS
  // ==========================================

  async getElementCompanyId(elementId: string): Promise<string | null> {
    return this.elementRepository.findCompanyId(elementId);
  }

  async getElementProjectId(elementId: string): Promise<string | null> {
    return this.elementRepository.findProjectId(elementId);
  }
}
