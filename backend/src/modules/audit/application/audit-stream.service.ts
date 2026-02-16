import { ArchitecturalAuditor } from "./architectural-auditor.service";
import { GovernanceService } from "./governance.service";
import { logger } from "@/lib/utils/logger";

export class AuditStreamService {
    constructor(private readonly governanceService: GovernanceService) { }

    public createScanStream(userId: string): ReadableStream {
        const encoder = new TextEncoder();
        const auditor = new ArchitecturalAuditor(this.governanceService);
        let isStreamClosed = false;

        return new ReadableStream({
            async start(controller) {
                const sendEvent = (type: string, data: any) => {
                    if (isStreamClosed) return;
                    try {
                        const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
                        controller.enqueue(encoder.encode(event));
                    } catch (e) {
                        // Silenciosamente marcar como fechado, pois o cliente desconectou
                        isStreamClosed = true;
                    }
                };

                sendEvent("connected", { message: "Iniciando verificação de auditoria..." });

                try {
                    const { results, summary } = await auditor.runFullAudit(userId);

                    let count = 0;
                    for (const result of results) {
                        if (isStreamClosed) break; // Interromper processamento se cliente desconectou

                        count++;
                        sendEvent("violation", {
                            index: count,
                            total: results.length,
                            file: result.file,
                            severity: result.severity,
                            violation: result.violation,
                            message: result.message,
                            suggestion: result.suggestion,
                        });

                        // Delay visual simulado (configurável ou removível se performance for prioridade)
                        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));
                    }

                    sendEvent("complete", {
                        healthScore: summary.healthScore,
                        totalFiles: summary.totalFiles,
                        violationsCount: summary.violationsCount,
                        bySeverity: summary.bySeverity,
                        topIssues: summary.topIssues,
                    });
                } catch (error: any) {
                    const message = error instanceof Error ? error.message : String(error);
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
            }
        });
    }
}
