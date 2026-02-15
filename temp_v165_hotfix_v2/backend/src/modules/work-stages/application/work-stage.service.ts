import {
  WorkStageRepository,
  WorkStage,
  CreateWorkStageDTO,
  WorkStageProgress,
} from "../domain/work-stage.repository";
import { logger } from "@/lib/utils/logger";

export class WorkStageService {
  constructor(private readonly repository: WorkStageRepository) {}

  async getStagesBySite(siteId: string): Promise<any[]> {
    const stages = await this.repository.findAllBySiteId(siteId);
    // Map progress to match the expected format in the frontend hook
    return stages.map((s: any) => ({
      ...s,
      stage_progress: s.progress,
    }));
  }

  async getStagesByProject(projectId: string): Promise<any[]> {
    const stages = await this.repository.findAllByProjectId(projectId);
    return stages.map((s: any) => ({
      ...s,
      stage_progress: s.progress,
    }));
  }

  async createStage(data: CreateWorkStageDTO): Promise<WorkStage> {
    return await this.repository.create(data);
  }

  async update(id: string, data: Partial<CreateWorkStageDTO>): Promise<WorkStage> {
    return await this.repository.update(id, data);
  }

  async listProgress(stageId?: string): Promise<WorkStageProgress[]> {
    return this.repository.listProgress(stageId);
  }

  async upsertProgress(data: Partial<WorkStageProgress>) {
    return this.repository.saveProgress(data);
  }

  /**
   * Sincroniza o progresso de todas as etapas vinculadas a um projeto ou canteiro
   */
  async syncStages(
    params: { siteId?: string; projectId?: string },
    companyId: string,
    isAdmin: boolean,
  ): Promise<any[]> {
    const { siteId, projectId } = params;

    logger.info(`Iniciando sincronização de etapas`, {
      source: "WorkStage/WorkStageService",
      siteId,
      projectId,
      companyId,
    });

    let stages = [];
    if (siteId && siteId !== 'all') {
      stages = await this.repository.findLinkedStagesBySite(
        siteId,
        isAdmin ? undefined : companyId,
      );
    } else if (projectId) {
      stages = await this.repository.findLinkedStagesByProjectId(
        projectId,
        isAdmin ? undefined : companyId,
      );
    } else {
      return [];
    }

    const results = [];

    const useSiteFilter = !!(siteId && siteId !== 'all');

    for (const stage of stages) {
      try {
        const effectiveProjectId = stage.site?.projectId || projectId;
        if (!effectiveProjectId) continue;

        const avgProgress = await this.calculateAverageProgress(
          stage, 
          effectiveProjectId, 
          useSiteFilter
        );

        await this.updateTodayProgress(stage.id, avgProgress);

        results.push({ stage: stage.name, progress: avgProgress });
      } catch (err: any) {
        logger.error(`Error syncing stage ${stage.id} (${stage.name}): ${err.message}`, {
            trace: err.stack,
            stageId: stage.id
        });
        // Continue syncing other stages
      }
    }

    return results;
  }

  // Keeping syncStagesBySite for backward compatibility if needed, but pointing to the new one
  async syncStagesBySite(
    siteId: string,
    companyId: string,
    isAdmin: boolean,
  ): Promise<any[]> {
    return this.syncStages({ siteId }, companyId, isAdmin);
  }

  /**
   * Calcula o progresso médio ponderado de uma etapa com base nos elementos de produção.
   * Usa a Regra dos 100%: sum(peso_i * progresso_i) / sum(peso_i)
   */
  private async calculateAverageProgress(
    stage: WorkStage,
    projectId: string,
    useSiteFilter: boolean = true,
  ): Promise<number> {
    if (!stage.productionActivityId) return 0;

    const result = await this.repository.findProductionElementsWeighted(
      projectId,
      stage.productionActivityId,
      useSiteFilter ? stage.site?.name : undefined,
    );

    // result: { totalWeight, weightedProgress }
    if (!result || result.totalWeight === 0) return 0;
    
    // Progresso ponderado: sum(peso * progresso%) / sum(peso)
    return Math.min(100, result.weightedProgress / result.totalWeight);
  }

  private async updateTodayProgress(
    stageId: string,
    progress: number,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.repository.findProgressByDate(stageId, today);

    await this.repository.saveProgress({
      id: existing?.id,
      stageId,
      actualPercentage: progress,
      recordedDate: today,
      notes: "Sincronização Automática (Modelo DDD)",
    });
  }
}
