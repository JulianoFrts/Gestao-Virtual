import { ITaskHandler } from "@/modules/common/domain/task-handler.interface";
import { TowerImportService } from "@/modules/tower/application/tower-import.service";
import { logger } from "@/lib/utils/logger";

export class TowerImportHandler implements ITaskHandler {
  constructor(private readonly importService: TowerImportService) {}

  async handle(payload: unknown): Promise<void> {
    logger.info("[Worker] Iniciando processamento de importação de torres...");

    if (!payload.data || !Array.isArray(payload.data)) {
      throw new Error(
        "Payload inválido: campo 'data' ausente ou não é um array",
      );
    }

    if (!payload.projectId || !payload.companyId) {
      throw new Error(
        "Payload inválido: projectId e companyId são obrigatórios",
      );
    }

    const { data, projectId, companyId, siteId } = payload;

    // Processamento via TowerImportService
    const results = await this.importService.processImport(
      projectId,
      companyId,
      data,
      siteId,
    );

    logger.info("[Worker] Importação de torres concluída", {
      total: results.total,
      success: results.imported,
      failed: results.failed,
    });

    if (results.failed > 0) {
      logger.warn("[Worker] Algumas torres falharam ao serem importadas", {
        errors: results.errors,
      });
    }
  }
}
