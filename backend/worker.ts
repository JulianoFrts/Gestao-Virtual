import { loadEnv } from "@/lib/utils/env";
loadEnv();

import { logger } from "@/lib/utils/logger";

type HandlerRegistration = {
  name: string;
  loader: () => Promise<any>;
  factory?: (deps: Dependencies) => any;
};

type Dependencies = {
  importService?: any;
};

async function loadDependencies(): Promise<Dependencies> {
  const { ImportService } =
    await import("@/modules/users/application/import.service");

  return {
    importService: new ImportService(),
  };
}

async function registerHandlers(worker: any, deps: Dependencies) {
  const handlers: HandlerRegistration[] = [
    {
      name: "permission_matrix_update",
      loader: async () => {
        const { PermissionMatrixHandler } =
          await import("@/modules/common/infrastructure/worker/handlers/permission-matrix.handler");
        return new PermissionMatrixHandler();
      },
    },
    {
      name: "JOB_FUNCTION_IMPORT",
      loader: async () => {
        const { JobFunctionImportHandler } =
          await import("@/modules/common/infrastructure/worker/handlers/job-function-import.handler");
        return new JobFunctionImportHandler(deps.importService);
      },
    },
    {
      name: "EMPLOYEE_IMPORT",
      loader: async () => {
        const { EmployeeImportHandler } =
          await import("@/modules/common/infrastructure/worker/handlers/employee-import.handler");
        return new EmployeeImportHandler(deps.importService);
      },
    },
    {
      name: "daily_report_bulk_approve",
      loader: async () => {
        const { DailyReportBulkApproveHandler } =
          await import("@/modules/production/infrastructure/worker/handlers/daily-report-bulk-approve.handler");
        const { ProductionFactory } =
          await import("@/modules/production/application/production.factory");
        return new DailyReportBulkApproveHandler(
          ProductionFactory.createDailyReportService(),
        );
      },
    },
    {
      name: "daily_report_bulk_reject",
      loader: async () => {
        const { DailyReportBulkRejectHandler } =
          await import("@/modules/production/infrastructure/worker/handlers/daily-report-bulk-reject.handler");
        const { ProductionFactory } =
          await import("@/modules/production/application/production.factory");
        return new DailyReportBulkRejectHandler(
          ProductionFactory.createDailyReportService(),
        );
      },
    },
    {
      name: "TOWER_IMPORT",
      loader: async () => {
        const { TowerImportHandler } =
          await import("@/modules/tower/infrastructure/worker/handlers/tower-import.handler");
        const { TowerImportService } =
          await import("@/modules/tower/application/tower-import.service");
        const { TowerProductionService } =
          await import("@/modules/tower/application/tower-production.service");
        const { TowerConstructionService } =
          await import("@/modules/tower/application/tower-construction.service");
        const { TowerActivityService } =
          await import("@/modules/tower/application/tower-activity.service");
        const { PrismaTowerProductionRepository } =
          await import("@/modules/tower/infrastructure/prisma-tower-production.repository");
        const { PrismaTowerConstructionRepository } =
          await import("@/modules/tower/infrastructure/prisma-tower-construction.repository");
        const { PrismaTowerActivityRepository } =
          await import("@/modules/tower/infrastructure/prisma-tower-activity.repository");
        const { PrismaMapElementRepository } =
          await import("@/modules/map-elements/infrastructure/prisma-map-element.repository");

        const productionService = new TowerProductionService(
          new PrismaTowerProductionRepository(),
        );
        const constructionService = new TowerConstructionService(
          new PrismaTowerConstructionRepository(),
          new PrismaTowerProductionRepository(),
        );
        const activityService = new TowerActivityService(
          new PrismaTowerActivityRepository(),
        );
        const mapElementRepository = new PrismaMapElementRepository();

        return new TowerImportHandler(
          new TowerImportService(
            productionService,
            constructionService,
            activityService,
            mapElementRepository,
          ),
        );
      },
    },
  ];

  for (const handlerConfig of handlers) {
    try {
      const handler = await handlerConfig.loader();
      worker.registerHandler(handlerConfig.name, handler);

      logger.info(`Handler registrado`, {
        handler: handlerConfig.name,
      });
    } catch (error) {
      logger.error(`Erro ao registrar handler`, {
        handler: handlerConfig.name,
        error,
      });
      throw error;
    }
  }
}

async function createWorker() {
  const { TaskWorker } =
    await import("@/modules/common/application/task-worker");

  return new TaskWorker();
}

function setupGracefulShutdown(worker: any) {
  const shutdown = () => {
    logger.info("Encerrando worker...");
    worker.stop();

    setTimeout(() => process.exit(0), 1000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function bootstrap() {
  logger.info("Inicializando Worker...");

  try {
    const worker = await createWorker();

    const dependencies = await loadDependencies();

    await registerHandlers(worker, dependencies);

    setupGracefulShutdown(worker);

    await worker.start();

    logger.info("Worker iniciado com sucesso");
  } catch (error) {
    logger.error("Erro fatal na inicialização do worker", { error });
    process.exit(1);
  }
}

bootstrap();
