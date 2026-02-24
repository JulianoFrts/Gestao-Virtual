import { DailyReportStatus } from "@prisma/client";
import { DailyReportRepository } from "../domain/daily-report.repository";
import { ProductionProgressService } from "./production-progress.service";
import { logger } from "@/lib/utils/logger";
import { QueueService } from "@/modules/common/application/queue.service";

export class DailyReportService {
  constructor(
    private readonly repository: DailyReportRepository,
    private readonly progressService: ProductionProgressService,
    private readonly queueService?: QueueService,
  ) {}

  async listReports(params: any) {
    const {
      page = 1,
      limit = 20,
      teamId,
      userId,
      startDate,
      endDate,
      status,
      companyId,
    } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (companyId) {
      where.companyId = companyId;
    }
    if (teamId) where.teamId = teamId;
    if (userId) where.userId = userId;
    if (status && status !== "all") where.status = status;
    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) where.reportDate.gte = new Date(startDate);
      if (endDate) where.reportDate.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.repository.findAll(where, skip, limit, { reportDate: "desc" }),
      this.repository.count(where),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async createReport(data: any) {
    try {
      // Sanitização final para remover campos legados que causam erro no Prisma
      const sanitizedData = { ...data };
      const fieldsToRemove = [
        "scheduledAt",
        "executedAt",
        "reviewedAt",
        "syncedAt",
        "scheduled_at",
        "executed_at",
        "reviewed_at",
      ];

      fieldsToRemove.forEach((field) => delete sanitizedData[field]);

      const result = await this.repository.create({
        ...sanitizedData,
        reportDate: new Date(data.reportDate || new Date()),
      });
      return result;
    } catch (error: any) {
      logger.error("Prisma error during createReport in DailyReportService:", {
        message: error.message,
        code: error.code,
        meta: error.meta,
        dataPayload: data,
      });
      throw error;
    }
  }

  async getReportById(id: string) {
    return this.repository.findById(id);
  }

  async updateReport(id: string, data: any) {
    return this.repository.update(id, data);
  }

  async approveReport(id: string, approvedById: string) {
    const report = await this.repository.findById(id);
    if (!report) throw new Error("Relatório não encontrado");
    if (report.status === "APPROVED") return report;

    // 1. Atualizar status do relatório
    const updatedReport = await this.repository.update(id, {
      status: DailyReportStatus.APPROVED,
      approvedById,
    });

    // 2. Sincronizar progresso de produção
    await this.syncProductionProgress(updatedReport, approvedById);

    return updatedReport;
  }

  async rejectReport(id: string, reason: string) {
    return this.repository.update(id, {
      status: DailyReportStatus.RETURNED,
      rejectionReason: reason,
    });
  }

  async bulkApproveReports(ids: string[], userId: string) {
    if (this.queueService) {
      return this.queueService.enqueue("daily_report_bulk_approve", {
        ids,
        userId,
      });
    }
    return this._executeBulkApprove(ids, userId);
  }

  async bulkRejectReports(ids: string[], reason: string) {
    if (this.queueService) {
      return this.queueService.enqueue("daily_report_bulk_reject", {
        ids,
        reason,
      });
    }
    return this._executeBulkReject(ids, reason);
  }

  async _executeBulkApprove(ids: string[], approvedById: string) {
    logger.info(
      `[Worker] Iniciando aprovação em lote de ${ids.length} relatórios`,
      { approvedById },
    );

    // 1. Buscar apenas o essencial para processamento rápido (SELECT Minimal!)
    const reports = await this.repository.findAllMinimal(ids);

    // Filtrar apenas o que realmente precisa ser processado
    const pendingReports = reports.filter((r) => r.status !== "APPROVED");
    const pendingIds = pendingReports.map((r) => r.id);

    if (pendingIds.length === 0) {
      logger.info("[Worker] Nenhum relatório pendente encontrado no lote.");
      return ids.map((id) => ({ id, success: true }));
    }

    // 2. Atualizar todos os relatórios para APPROVED de uma só vez (Performance!)
    await this.repository.updateMany(pendingIds, {
      status: "APPROVED",
      approvedById,
    });

    // 3. Sincronizar progresso de forma ultra-otimizada (Agregação de DTOs)
    const results = [];
    const syncTasks = new Set<string>();
    const progressDtos: any[] = [];

    for (const report of pendingReports) {
      try {
        // Extração robusta do ProjectId
        const projectId =
          report.projectId ||
          report.metadata?.projectId ||
          (report as any).project_id ||
          report.team?.site?.projectId;
        const activities = report.metadata?.selectedActivities || [];

        for (const act of activities) {
          if (!act.details || !Array.isArray(act.details)) continue;

          for (const detail of act.details) {
            if (detail.status === "BLOCKED") continue;

            progressDtos.push({
              elementId: detail.id,
              activityId: act.stageId,
              status: detail.status,
              progress: Number(detail.progress),
              projectId: projectId,
              userId: approvedById,
              skipSync: true, // Sempre skip aqui, faremos ao final se necessário
              metadata: {
                reportId: report.id,
                startTime: detail.startTime,
                endTime: detail.endTime,
                comment: detail.comment,
                leadName: report.user?.name,
                supervisorName:
                  report.team?.supervisor?.name || report.team?.name,
              },
              dates: {
                start: detail.startTime,
                end: detail.status === "FINISHED" ? detail.endTime : null,
              },
            });

            if (projectId && act.stageId) {
              syncTasks.add(`${projectId}:${act.stageId}:${detail.id}`);
            }
          }
        }
        results.push({ id: report.id, success: true });
      } catch (error: any) {
        logger.error(
          `[Worker] Falha ao preparar progresso (Report: ${report.id}): ${error.message}`,
        );
        results.push({ id: report.id, success: false, error: error.message });
      }
    }

    // DISPARAR EXECUÇÃO EM LOTE DO PROGRESSO
    if (progressDtos.length > 0) {
      await this.progressService.updateProgressBatch(progressDtos);
    }

    // 4. Disparar sincronização de estágios UMA VEZ por atividade/projeto (Performance O(1) por atividade)
    logger.info(
      `[Worker] Iniciando sincronização agregada de ${syncTasks.size} combinações atividade/projeto`,
    );
    for (const task of syncTasks) {
      const [projectId, activityId, elementId] = task.split(":");
      if (projectId && activityId && elementId) {
        try {
          await this.progressService.triggerStageSync(
            elementId,
            activityId,
            projectId,
            approvedById,
          );
        } catch (err: any) {
          logger.warn(
            `[Worker] Falha na sincronização agregada para ${activityId}:`,
            { error: err.message },
          );
        }
      }
    }

    // Adicionar os que já estavam aprovados como sucesso
    const alreadyApprovedIds = ids.filter((id) => !pendingIds.includes(id));
    alreadyApprovedIds.forEach((id) => results.push({ id, success: true }));

    logger.info(
      `[Worker] Aprovação em lote concluída: ${pendingIds.length} processados.`,
    );
    return results;
  }

  async _executeBulkReject(ids: string[], reason: string) {
    return this.repository.updateMany(ids, {
      status: DailyReportStatus.RETURNED,
      rejectionReason: reason,
    });
  }

  private async syncProductionProgress(
    report: any,
    userId: string,
    skipSync = false,
    projectId?: string,
  ) {
    try {
      const metadata = report.metadata || {};
      const activities = metadata.selectedActivities;

      if (!Array.isArray(activities)) {
        logger.warn(
          "Relatório aprovado sem metadados de atividades detalhadas",
          { reportId: report.id },
        );
        return;
      }

      for (const act of activities) {
        if (!act.details || !Array.isArray(act.details)) continue;

        for (const detail of act.details) {
          if (detail.status === "BLOCKED") continue; // Não pontua progresso se bloqueado

          await this.progressService.updateProgress({
            elementId: detail.id,
            activityId: act.stageId,
            status: detail.status,
            progress: Number(detail.progress),
            projectId:
              projectId ||
              report.projectId ||
              report.metadata?.projectId ||
              (report as any).project_id ||
              report.team?.site?.projectId,
            userId,
            skipSync, // PERFORMANCE: Suprime o AVG pesado para cada detalhe
            metadata: {
              reportId: report.id,
              startTime: detail.startTime,
              endTime: detail.endTime,
              comment: detail.comment,
              leadName: report.user?.name,
              supervisorName:
                report.team?.supervisor?.name || report.team?.name,
            },
            dates: {
              start: detail.startTime,
              end: detail.status === "FINISHED" ? detail.endTime : null,
            },
          });
        }
      }
    } catch (error: any) {
      logger.error("Erro ao sincronizar progresso do relatório aprovado", {
        error: error.message,
        reportId: report.id,
      });
    }
  }
}
