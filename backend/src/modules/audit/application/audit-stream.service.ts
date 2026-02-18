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

                sendEvent("connected", { message: "Iniciando auditoria... (Aguarde)" });

                try {
                    let count = 0;
                    
                    // 1. Notify file scanning start
                    sendEvent("status", { message: "Mapeando estrutura de arquivos...", state: "scanning_files" });
                    
                    const { results, summary } = await auditor.runFullAudit(userId, false, (result) => {
                         if (isStreamClosed) return;
                         
                         count++;
                         // First violation detected means scanning is done and processing started
                         if (count === 1) {
                             sendEvent("status", { message: "Analisando código...", state: "analyzing" });
                         }
                         if (isStreamClosed) return;
                         
                         count++;
                         sendEvent("violation", {
                             index: count,
                             // Total ainda é desconhecido durante o stream real, ou teríamos que passar o total de arquivos?
                             // O frontend espera `total` para a barra de progresso.
                             // Podemos estimar ou simplesmente omitir/passar 0 se não soubermos.
                             // Mas espere, auditor.runFullAudit calcula arquivos antes.
                             // Porém performAuditScanParallel não expõe o total de arquivos facilmente, mas runFullAudit tem `files`.
                             // Refatoração rápida: O createScanStream não tem acesso ao `files.length` antes.
                             // Vou passar `100` ou um valor placeholder, ou melhor:
                             // Atualizar a interface do onProgress para incluir (current, total)?
                             // Por agora, vamos enviar o violation. O frontend usa total para %.
                             // Se omitirmos total, a barra pode não funcionar, mas os logs aparecerão.
                             total: 100, // Valor placeholder para evitar Infinity e permitir renderização (progresso será impreciso durante stream)
                             file: result.file,
                             severity: result.severity,
                             violation: result.violation,
                             message: result.message,
                             suggestion: result.suggestion,
                         });
                    });

                    // Send final complete event
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
