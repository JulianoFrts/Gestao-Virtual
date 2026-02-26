import { ITaskHandler } from "@/modules/common/domain/task-handler.interface";
import { ImportService } from "@/modules/users/application/import.service";
import { logger } from "@/lib/utils/logger";

export class JobFunctionImportHandler implements ITaskHandler {
  constructor(private readonly importService: ImportService) {}

  async handle(payload: unknown): Promise<void> {
    logger.info("[Worker] Iniciando processamento de importação de funções...");

    if (!payload.data || !Array.isArray(payload.data)) {
      throw new Error("Payload inválido: campo 'data' ausente ou não é um array");
    }

    const { data } = payload;
    
    // Processamento via ImportService
    // Nota: O ImportService já lida com duplicidades ignorando-as silenciosamente 
    // ou registrando falhas conforme o caso.
    const results = await this.importService.processFunctionImport(data);

    logger.info("[Worker] Importação de funções concluída", {
      total: results.total,
      success: results.imported,
      failed: results.failed
    });

    if (results.failed > 0) {
      logger.warn("[Worker] Algumas funções falharam ao serem importadas", {
        errors: results.errors
      });
      // Podemos optar por não lançar erro aqui para que o job seja marcado como completed
      // mas com os resultados no log/payload, ou lançar se considerarmos falha total.
      // O frontend verá o status como 'completed' e o worker registrou o detalhe.
    }
  }
}
