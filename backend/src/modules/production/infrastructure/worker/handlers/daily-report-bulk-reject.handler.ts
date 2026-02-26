import { ITaskHandler } from "@/modules/common/domain/task-handler.interface";
import { DailyReportService } from "@/modules/production/application/daily-report.service";
import { logger } from "@/lib/utils/logger";

export class DailyReportBulkRejectHandler implements ITaskHandler {
  constructor(private readonly dailyReportService: DailyReportService) {}

  async handle(payload: unknown): Promise<void> {
    const { ids, reason } = payload;

    if (!Array.isArray(ids) || !reason) {
      throw new Error("Payload inválido para DailyReportBulkRejectHandler");
    }

    logger.info(`[Worker] Iniciando devolução em lote de ${ids.length} relatórios`);

    await this.dailyReportService._executeBulkReject(ids, reason);

    logger.info(`[Worker] Devolução em lote concluída.`);
  }
}
