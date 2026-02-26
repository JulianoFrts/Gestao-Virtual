import { ArchitecturalAuditor } from "./architectural-auditor.service";
import { GovernanceService } from "./governance.service";
import { logger } from "@/lib/utils/logger";

export class AuditStreamService {
  constructor(private readonly governanceService: GovernanceService) {}

  public createScanStream(userId: string): ReadableStream {
    const encoder = new TextEncoder();
    const auditor = new ArchitecturalAuditor(this.governanceService);
    let isStreamClosed = false;

    return new ReadableStream({
      async start(controller): Promise<unknown> {
        const sendEvent = (type: string, data: unknown) => {
          if (isStreamClosed) return;
          try {
            const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
            controller.enqueue(encoder.encode(event));
          } catch (e) {
            // Silenciosamente marcar como fechado, pois o cliente desconectou
            isStreamClosed = true;
          }
        };

        sendEvent("connected", { message: "Iniciando auditoria... (Aguarde)" });

        try {
          let count = 0;

          // 1. Notify file scanning start
          sendEvent("status", {
            message: "Mapeando estrutura de arquivos...",
            state: "scanning_files",
          });

          const { summary } = await auditor.runFullAudit(
            userId,
            undefined,
            false,
            (result, fileIndex, totalFiles) => {
              if (isStreamClosed) return;

              count++;
              // First violation detected means scanning is done and processing started
              if (count === 1) {
                sendEvent("status", {
                  message: "Analisando código...",
                  state: "analyzing",
                });
              }
              if (isStreamClosed || !result) return;

              sendEvent("violation", {
                // index represents the file completion count
                index: fileIndex,
                // total represents the absolute number of files to process
                total: totalFiles,
                file: result.file,
                severity: result.severity,
                violation: result.violation,
                message: result.message,
                suggestion: result.suggestion,
              });
            },
          );

          // Send final complete event
          sendEvent("complete", {
            healthScore: summary.healthScore,
            totalFiles: summary.totalFiles,
            violationsCount: summary.violationsCount,
            bySeverity: summary.bySeverity,
            topIssues: summary.topIssues,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          logger.error("Erro durante stream de auditoria", { error, userId });
          sendEvent("error", { message: message || "Erro na verificação" });
        } finally {
          if (!isStreamClosed) {
            try {
              controller.close();
            } catch (e) {
              // Ignorar erro ao fechar se já estiver fechado
            }
          }
          isStreamClosed = true;
        }
      },
      cancel() {
        isStreamClosed = true;
      },
    });
  }
}
