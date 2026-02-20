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

  static create(): ProductionService {
    if (!this.instance) {
      const progressRepository = new PrismaProductionProgressRepository();
      const elementRepository = new PrismaProjectElementRepository();
      const syncRepository = new PrismaProductionSyncRepository();
      const scheduleRepository = new PrismaProductionScheduleRepository();
      const catalogueRepository = new PrismaProductionCatalogueRepository();

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

  static createDailyReportService(): DailyReportService {
    const production = this.create();
    const taskRepository = new PrismaTaskRepository();
    const queueService = new QueueService(taskRepository);
    
    return new DailyReportService(
      new PrismaDailyReportRepository(),
      production.progressService,
      queueService
    );
  }
}
