import {
  WorkStageRepository,
  WorkStage,
  CreateWorkStageDTO,
  WorkStageProgress,
} from "../domain/work-stage.repository";
import { logger } from "@/lib/utils/logger";

export class WorkStageService {
  constructor(private readonly repository: WorkStageRepository) { }

  async findAll(params: {
    siteId?: string | null;
    projectId?: string | null;
    companyId?: string | null;
    linkedOnly?: boolean;
  }): Promise<WorkStage[]> {
    // Normalização de parâmetros vinda do controller
    const siteId = (!params.siteId || params.siteId === 'all' || params.siteId === 'none' || params.siteId === 'undefined' || params.siteId === 'null') ? null : params.siteId;
    const projectId = (!params.projectId || params.projectId === 'all' || params.projectId === 'undefined' || params.projectId === 'null') ? null : params.projectId;

    if (!projectId && !siteId) {
      return [];
    }

    return this.repository.findAll({
      ...params,
      siteId,
      projectId
    });
  }

  async getStagesBySite(siteId: string): Promise<any[]> {
    const stages = await this.repository.findAllBySiteId(siteId);
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
    // 1. Validação de obrigatoriedade
    if (!data.name) {
      throw new Error("Name is required");
    }

    const effectiveSiteId = (!data.siteId || data.siteId === 'all' || data.siteId === 'none') ? null : data.siteId;
    const effectiveProjectId = (!data.projectId || data.projectId === 'all') ? null : data.projectId;

    if (!effectiveSiteId && !effectiveProjectId) {
      throw new Error("Site ID or Project ID is required");
    }

    // 2. Validação de Atividade de Produção (Regra de Negócio)
    let productionActivityId = data.productionActivityId;
    if (productionActivityId) {
      // Mock validation logic from route
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productionActivityId);
      if (!isUuid) {
        logger.warn(`[WorkStageService] Ignoring invalid/mock activityId: ${productionActivityId}`);
        productionActivityId = null;
      } else {
        const exists = await this.repository.verifyActivityExists(productionActivityId);
        if (!exists) {
          logger.warn(`[WorkStageService] Activity ${productionActivityId} not found.`);
          productionActivityId = null;
        }
      }
    }

    return await this.repository.create({
      ...data,
      siteId: effectiveSiteId,
      projectId: effectiveProjectId,
      productionActivityId
    });
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
      }
    }

    return results;
  }

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

    if (!result || result.totalWeight === 0) return 0;
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
