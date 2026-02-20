import {
  ProductionProgressRepository,
} from "../domain/production.repository";
import { ProjectElementRepository } from "../domain/project-element.repository";
import { ProductionSyncRepository } from "../domain/production-sync.repository";
import { ProductionScheduleRepository } from "../domain/production-schedule.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import { ProductionProgressService, UpdateProductionProgressDTO } from "./production-progress.service";
import { ProductionScheduleService } from "./production-schedule.service";
import { DailyProductionService } from "./daily-production.service";
import { RecordDailyProductionDTO } from "./dtos/record-daily-production.dto";

// Novos Repositórios (Divisão SRP)
import { PrismaProductionCatalogueRepository } from "../infrastructure/prisma-production-catalogue.repository";

export class ProductionService {
  public readonly progressService: ProductionProgressService;
  private readonly scheduleService: ProductionScheduleService;
  private readonly dailyService: DailyProductionService;

  constructor(
    private readonly progressRepository: ProductionProgressRepository,
    private readonly elementRepository: ProjectElementRepository,
    private readonly syncRepository: ProductionSyncRepository,
    private readonly scheduleRepository: ProductionScheduleRepository,
    private readonly catalogueRepository: PrismaProductionCatalogueRepository,
  ) {
    this.progressService = new ProductionProgressService(
      progressRepository,
      elementRepository,
      syncRepository,
      scheduleRepository
    );
    this.scheduleService = new ProductionScheduleService(
      scheduleRepository,
      progressRepository
    );
    this.dailyService = new DailyProductionService(
      progressRepository,
      elementRepository
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

  async updateProgress(dto: UpdateProductionProgressDTO): Promise<ProductionProgress> {
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
