import { ITaskHandler } from "@/modules/common/domain/task-handler.interface";
import { ImportService } from "@/modules/users/application/import.service";
import { logger } from "@/lib/utils/logger";

export class EmployeeImportHandler implements ITaskHandler {
  constructor(private readonly importService: ImportService) {}

  async handle(payload: unknown): Promise<void> {
    logger.info("[Worker] Iniciando processamento de importação de funcionários...");

    if (!payload.data || !Array.isArray(payload.data)) {
      throw new Error("Payload inválido: campo 'data' ausente ou não é um array");
    }

    const { data } = payload;
    
    // Processamento via ImportService que lida com criação de usuários, senhas e validações
    const results = await this.importService.processEmployeeImport(data);

    logger.info("[Worker] Importação de funcionários concluída", {
      total: results.total,
      success: results.imported,
      failed: results.failed
    });

    if (results.failed > 0) {
      logger.warn("[Worker] Alguns funcionários falharam ao serem importados", {
        errors: results.errors
      });
      // O job é marcado como concluído, os detalhes ficam nos logs e no resultado do job
    }
  }
}
