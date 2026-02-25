import {
  WorkStageRepository,
  WorkStage,
} from "../domain/work-stage.repository";
import { logger } from "@/lib/utils/logger";
import { WorkStageSyncService } from "@/modules/production/application/work-stage-sync.service";

export class WorkStageSyncManager {
  private readonly syncService: WorkStageSyncService;

  constructor(private readonly repository: WorkStageRepository) {
    this.syncService = new WorkStageSyncService();
  }

  async syncStagesOfScope(
    params: { siteId?: string; projectId?: string },
    companyId: string,
    isGlobal: boolean,
  ): Promise<any[]> {
    const { siteId, projectId } = params;

    let stages: WorkStage[] = [];
    if (siteId && siteId !== "all") {
      stages = await this.repository.findLinkedStagesBySite(
        siteId,
        isGlobal ? undefined : companyId,
      );
    } else if (projectId) {
      stages = await this.repository.findLinkedStagesByProjectId(
        projectId,
        isGlobal ? undefined : companyId,
      );
    } else {
      return [];
    }

    const results = [];
    const useSiteFilter = !!(siteId && siteId !== "all");

    for (const stage of stages) {
      try {
        const effectiveProjectId = stage.site?.projectId || projectId;
        if (!effectiveProjectId) continue;

        const syncResult = await this.calculateAverageProgress(
          stage,
          effectiveProjectId,
          useSiteFilter,
        );

        await this.updateTodayProgress(
          stage.id,
          syncResult.progress,
          syncResult.total,
          syncResult.executed,
        );

        results.push({
          stage: stage.name,
          progress: syncResult.progress,
          total: syncResult.total,
          executed: syncResult.executed,
        });
      } catch (err: any) {
        logger.error(
          `Error syncing stage ${stage.id} (${stage.name}): ${err.message}`,
          { stageId: stage.id },
        );
      }
    }

    if (projectId) {
      await this.syncService.syncAllStages(
        projectId,
        siteId && siteId !== "all" ? siteId : undefined,
      );
    }

    return results;
  }

  private async calculateAverageProgress(
    stage: WorkStage,
    projectId: string,
    useSiteFilter: boolean = true,
  ): Promise<{ progress: number; total: number; executed: number }> {
    if (!stage.productionActivityId)
      return { progress: 0, total: 0, executed: 0 };

    const result = await this.repository.findProductionElementsWeighted(
      projectId,
      stage.productionActivityId,
      useSiteFilter ? stage.site?.name : undefined,
    );

    if (!result || result.totalCount === 0)
      return { progress: 0, total: 0, executed: 0 };

    const progress = Math.min(
      100,
      (result.executedCount / result.totalCount) * 100,
    );

    return {
      progress: Math.round(progress * 10) / 10,
      total: result.totalCount,
      executed: result.executedCount,
    };
  }

  private async updateTodayProgress(
    stageId: string,
    progress: number,
    total?: number,
    executed?: number,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.repository.findProgressByDate(stageId, today);

    if (total !== undefined && executed !== undefined) {
      const metadata = await this.repository.getMetadata(stageId);
      metadata.totalTowers = total;
      metadata.executedTowers = executed;
      metadata.lastSync = new Date().toISOString();
      await this.repository.updateMetadata(stageId, metadata);
    }

    await this.repository.saveProgress({
      id: existing?.id,
      stageId,
      actualPercentage: progress,
      recordedDate: today,
      notes: "Sincronização Automática (Counts Logic)",
    });
  }
}
