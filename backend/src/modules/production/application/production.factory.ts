import { ProductionService } from "./production.service";
import { PrismaProductionProgressRepository } from "../infrastructure/prisma-production-progress.repository";
import { PrismaProjectElementRepository } from "../infrastructure/prisma-project-element.repository";
import { PrismaProductionSyncRepository } from "../infrastructure/prisma-production-sync.repository";
import { PrismaProductionScheduleRepository } from "../infrastructure/prisma-production-schedule.repository";
import { PrismaProductionCatalogueRepository } from "../infrastructure/prisma-production-catalogue.repository";
import { DailyReportService } from "./daily-report.service";
import { PrismaDailyReportRepository } from "../infrastructure/prisma-daily-report.repository";
import { QueueService } from "@/modules/common/application/queue.service";
import { PrismaTaskRepository } from "@/modules/common/infrastructure/prisma-task.repository";

export class ProductionFactory {
  private static instance: ProductionService;

  static create(deps?: {
    progressRepo?: unknown;
    elementRepo?: unknown;
    syncRepo?: unknown;
    scheduleRepo?: unknown;
    catalogueRepo?: unknown;
  }): ProductionService {
    if (!this.instance) {
      const progressRepository = deps?.progressRepo || new PrismaProductionProgressRepository();
      const elementRepository = deps?.elementRepo || new PrismaProjectElementRepository();
      const syncRepository = deps?.syncRepo || new PrismaProductionSyncRepository();
      const scheduleRepository = deps?.scheduleRepo || new PrismaProductionScheduleRepository();
      const catalogueRepository = deps?.catalogueRepo || new PrismaProductionCatalogueRepository();

      this.instance = new ProductionService(
        progressRepository,
        elementRepository,
        syncRepository,
        scheduleRepository,
        catalogueRepository
      );
    }
    return this.instance;
  }

  static createDailyReportService(deps?: {
    reportRepo?: unknown;
    queueService?: QueueService;
  }): DailyReportService {
    const production = this.create();
    
    const reportRepository = deps?.reportRepo || new PrismaDailyReportRepository();
    const queueService = deps?.queueService || new QueueService(new PrismaTaskRepository());
    
    return new DailyReportService(
      reportRepository,
      production.progressService,
      queueService
    );
  }
}
