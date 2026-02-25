import {
  WorkStageRepository,
  WorkStage,
  CreateWorkStageDTO,
  CreateWorkStageBulkItem,
  WorkStageProgress,
} from "../domain/work-stage.repository";
import { logger } from "@/lib/utils/logger";
import { WorkStageSyncService } from "@/modules/production/application/work-stage-sync.service";
import { prisma } from "@/lib/prisma/client";

export class WorkStageService {
  private readonly syncService: WorkStageSyncService;

  constructor(private readonly repository: WorkStageRepository) {
    this.syncService = new WorkStageSyncService();
  }

  async findAll(
    params: {
      siteId?: string | null;
      projectId?: string | null;
      companyId?: string | null;
      linkedOnly?: boolean;
    },
    securityContext?: any,
  ): Promise<WorkStage[]> {
    const siteId =
      !params.siteId ||
      ["all", "none", "undefined", "null"].includes(params.siteId)
        ? null
        : params.siteId;
    const projectId =
      !params.projectId ||
      ["all", "undefined", "null"].includes(params.projectId)
        ? null
        : params.projectId;

    let finalCompanyId = params.companyId;

    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal) {
        finalCompanyId = securityContext.companyId;
      }
    }

    if (!projectId && !siteId && !finalCompanyId) {
      return [];
    }

    return this.repository.findAll({
      ...params,
      siteId,
      projectId,
      companyId: finalCompanyId,
    });
  }

  async createStage(
    data: CreateWorkStageDTO,
    securityContext?: any,
  ): Promise<WorkStage> {
    if (!data.name) throw new Error("Name is required");

    const effectiveSiteId =
      !data.siteId || ["all", "none"].includes(data.siteId)
        ? null
        : data.siteId;
    const effectiveProjectId =
      !data.projectId || data.projectId === "all" ? null : data.projectId;

    if (!effectiveSiteId && !effectiveProjectId) {
      throw new Error("Site ID or Project ID is required");
    }

    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal) {
        if (effectiveSiteId) {
          const site = await prisma.site.findFirst({
            where: {
              id: effectiveSiteId,
              project: { companyId: securityContext.companyId },
            },
          });
          if (!site)
            throw new Error("Forbidden: Site não pertence à sua empresa");
        } else if (effectiveProjectId) {
          const project = await prisma.project.findFirst({
            where: {
              id: effectiveProjectId,
              companyId: securityContext.companyId,
            },
          });
          if (!project)
            throw new Error("Forbidden: Projeto não pertence à sua empresa");
        }
      }
    }

    let productionActivityId = data.productionActivityId;
    if (productionActivityId) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          productionActivityId,
        );
      if (!isUuid) {
        productionActivityId = null;
      } else {
        const exists =
          await this.repository.verifyActivityExists(productionActivityId);
        if (!exists) productionActivityId = null;
      }
    }

    return await this.repository.create({
      ...data,
      siteId: effectiveSiteId,
      projectId: effectiveProjectId,
      productionActivityId,
    });
  }

  async createBulk(
    projectId: string,
    siteId: string | undefined,
    data: CreateWorkStageBulkItem[],
    securityContext?: any,
  ): Promise<WorkStage[]> {
    if (!projectId || projectId === "all") {
      throw new Error("Project ID is required for bulk creation");
    }

    const effectiveSiteId =
      !siteId || ["all", "none"].includes(siteId) ? undefined : siteId;

    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, companyId: securityContext.companyId },
        });
        if (!project)
          throw new Error("Forbidden: Projeto não pertence à sua empresa");

        if (effectiveSiteId) {
          const site = await prisma.site.findFirst({
            where: {
              id: effectiveSiteId,
              project: { id: projectId, companyId: securityContext.companyId },
            },
          });
          if (!site)
            throw new Error(
              "Forbidden: Site não pertence ao projeto desta empresa",
            );
        }
      }
    }

    return await this.repository.createBulk(projectId, effectiveSiteId, data);
  }

  async update(
    id: string,
    data: Partial<CreateWorkStageDTO>,
    securityContext?: any,
  ): Promise<WorkStage> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Etapa não encontrada");

    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal) {
        const stageInCompany = await prisma.workStage.findFirst({
          where: {
            id,
            OR: [
              { project: { companyId: securityContext.companyId } },
              { site: { project: { companyId: securityContext.companyId } } },
            ],
          },
        });
        if (!stageInCompany)
          throw new Error("Forbidden: Etapa não pertence à sua empresa");
      }
    }

    return await this.repository.update(id, data);
  }

  async syncStages(
    params: { siteId?: string; projectId?: string },
    companyId: string,
    securityContext: any,
  ): Promise<any[]> {
    const { siteId, projectId } = params;
    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      securityContext.role,
      securityContext.hierarchyLevel,
      securityContext.permissions,
    );

    logger.info(`Iniciando sincronização de etapas`, {
      source: "WorkStage/WorkStageService",
      siteId,
      projectId,
      companyId,
    });

    if (!isGlobal) {
      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, companyId },
        });
        if (!project)
          throw new Error("Forbidden: Projeto não encontrado no seu escopo");
      }
      if (siteId && siteId !== "all") {
        const site = await prisma.site.findFirst({
          where: { id: siteId, project: { companyId } },
        });
        if (!site)
          throw new Error("Forbidden: Site não encontrado no seu escopo");
      }
    }

    let stages = [];
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

        const avgProgress = await this.calculateAverageProgress(
          stage,
          effectiveProjectId,
          useSiteFilter,
        );

        await this.updateTodayProgress(stage.id, avgProgress);
        results.push({ stage: stage.name, progress: avgProgress });
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
      await this.syncOrderWithGoals(projectId);
    }

    return results;
  }

  private async syncOrderWithGoals(projectId: string): Promise<void> {
    try {
      const goals = await prisma.towerActivityGoal.findMany({
        where: { projectId },
        orderBy: [{ level: "asc" }, { order: "asc" }],
      });

      if (goals.length === 0) return;

      const stages = await this.repository.findAll({ projectId });
      const updates: { id: string; displayOrder: number }[] = [];

      for (const goal of goals) {
        const goalName = goal.name.trim().toUpperCase();
        const matchedStages = stages.filter(
          (s) => s.name.trim().toUpperCase() === goalName,
        );

        for (const stage of matchedStages) {
          if (stage.displayOrder !== goal.order) {
            updates.push({ id: stage.id, displayOrder: goal.order });
          }
        }
      }

      if (updates.length > 0) {
        await this.repository.reorder(updates);
      }
    } catch (error: any) {
      logger.error(
        `[WorkStageService] syncOrderWithGoals error: ${error.message}`,
      );
    }
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

  async delete(id: string, securityContext?: any): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Etapa não encontrada");

    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal) {
        const stageInCompany = await prisma.workStage.findFirst({
          where: {
            id,
            OR: [
              { project: { companyId: securityContext.companyId } },
              { site: { project: { companyId: securityContext.companyId } } },
            ],
          },
        });
        if (!stageInCompany)
          throw new Error("Forbidden: Etapa não pertence à sua empresa");
      }
    }

    return await this.repository.delete(id);
  }

  async deleteBySite(siteId: string, securityContext?: any): Promise<void> {
    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal) {
        const site = await prisma.site.findFirst({
          where: {
            id: siteId,
            project: { companyId: securityContext.companyId },
          },
        });
        if (!site)
          throw new Error("Forbidden: Site não pertence à sua empresa");
      }
    }

    return await this.repository.deleteBySite(siteId);
  }

  async reorder(
    updates: { id: string; displayOrder: number }[],
    securityContext?: any,
  ): Promise<void> {
    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal) {
        // Verificar se TODAS as etapas pertencem à empresa
        const stages = await prisma.workStage.findMany({
          where: {
            id: { in: updates.map((u) => u.id) },
          },
          select: {
            id: true,
            projectId: true,
            site: { select: { projectId: true } },
          },
        });

        for (const stage of stages) {
          const pid = stage.projectId || stage.site?.projectId;
          if (!pid) throw new Error("Forbidden: Etapa sem projeto associado");

          const project = await prisma.project.findFirst({
            where: { id: pid, companyId: securityContext.companyId },
          });
          if (!project)
            throw new Error(
              "Forbidden: Uma ou mais etapas não pertencem à sua empresa",
            );
        }
      }
    }

    return await this.repository.reorder(updates);
  }
}
