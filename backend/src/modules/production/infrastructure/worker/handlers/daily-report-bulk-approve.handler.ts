import { ITaskHandler } from "@/modules/common/domain/task-handler.interface";
import { DailyReportService } from "@/modules/production/application/daily-report.service";
import { logger } from "@/lib/utils/logger";

export class DailyReportBulkApproveHandler implements ITaskHandler {
  constructor(private readonly dailyReportService: DailyReportService) {}

  async handle(payload: any): Promise<void> {
    const { ids, userId } = payload;

    if (!Array.isArray(ids) || !userId) {
      throw new Error("Payload inválido para DailyReportBulkApproveHandler");
    }

    logger.info(`[Worker] Iniciando aprovação em lote de ${ids.length} relatórios`, { userId });

    const results = await this.dailyReportService._executeBulkApprove(ids, userId);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    logger.info(`[Worker] Aprovação em lote concluída. Sucesso: ${successCount}, Falha: ${failCount}`);
    
    if (failCount > 0) {
      const errors = results.filter(r => !r.success).map(r => `${r.id}: ${r.error}`).join("; ");
      logger.warn(`[Worker] Alguns relatórios falharam na aprovação: ${errors}`);
    }
  }
}
