import { prisma } from "@/lib/prisma/client";
import { ICacheService } from "@/services/cache.interface";
import {
  WorkStageReadRepository,
  WorkStage,
} from "../domain/work-stage.repository";
import { WorkStageProgress } from "../domain/work-stage-progress.repository";

const WORK_STAGES_CACHE_TTL = 300;
const PROGRESS_CACHE_TTL = 60;

export class PrismaWorkStageReadRepository implements WorkStageReadRepository {
  constructor(private readonly cacheService: ICacheService) {}

  async findLinkedStagesBySite(
    siteId: string,
    companyId?: string,
  ): Promise<WorkStage[]> {
    const stages = await prisma.workStage.findMany({
      where: {
        siteId,
        productionActivityId: { not: null },
        site: {
          project: { companyId: companyId || undefined },
        },
      },
      include: { site: { include: { project: true } } },
    });
    return stages.map((s) => this.mapToWorkStage(s));
  }

  async findLinkedStagesByProjectId(
    projectId: string,
    companyId?: string,
  ): Promise<WorkStage[]> {
    const stages = await prisma.workStage.findMany({
      where: {
        site: {
          projectId,
          project: { companyId: companyId || undefined },
        },
        productionActivityId: { not: null },
      },
      include: { site: { include: { project: true } } },
    });
    return stages.map((s) => this.mapToWorkStage(s));
  }

  async findProgressByDate(
    stageId: string,
    date: Date,
  ): Promise<WorkStageProgress | null> {
    const progress = await prisma.stageProgress.findFirst({
      where: {
        stageId,
        recordedDate: date,
      },
    });
    return progress
      ? ({
          ...progress,
          actualPercentage: Number(progress.actualPercentage),
        } as WorkStageProgress)
      : null;
  }

  async findAll(params: {
    siteId?: string | null;
    projectId?: string | null;
    companyId?: string | null;
    linkedOnly?: boolean;
  }): Promise<WorkStage[]> {
    const { siteId, projectId, companyId, linkedOnly } = params;

    const cacheKey = `work_stages:list:${projectId || "all"}:${siteId || "all"}:${linkedOnly || "false"}:${companyId || "all"}`;
    const cached = await this.cacheService.get<WorkStage[]>(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = {};

    if (linkedOnly) (where as unknown).productionActivityId = { not: null };

    if (siteId && projectId) {
      (where as unknown).OR = [
        { siteId: siteId },
        { AND: [{ projectId: projectId }, { siteId: null }] },
      ];
    } else if (siteId) {
      (where as unknown).siteId = siteId;
    } else if (projectId) {
      (where as unknown).OR = [
        { projectId: projectId },
        { site: { projectId: projectId } },
      ];
    }

    if (companyId) (where as unknown).project = { companyId: companyId };

    const stages = await prisma.workStage.findMany({
      where: where as unknown,
      include: {
        stageProgress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        site: { include: { project: true } },
      },
      orderBy: { displayOrder: "asc" },
    });

    const result = stages.map((s) => this.mapToWorkStage(s));

    await this.cacheService.set(
      cacheKey,
      result,
      linkedOnly ? PROGRESS_CACHE_TTL : WORK_STAGES_CACHE_TTL,
    );

    return result;
  }

  async findAllBySiteId(siteId: string): Promise<WorkStage[]> {
    const stages = await prisma.workStage.findMany({
      where: { siteId },
      include: {
        stageProgress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
      },
      orderBy: { displayOrder: "asc" },
    });
    return stages.map((s) => this.mapToWorkStage(s));
  }

  async findAllByProjectId(projectId: string): Promise<WorkStage[]> {
    const stages = await prisma.workStage.findMany({
      where: { site: { projectId } },
      include: {
        stageProgress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        site: true,
      },
      orderBy: { displayOrder: "asc" },
    });
    return stages.map((s) => this.mapToWorkStage(s));
  }

  async listProgress(stageId?: string): Promise<WorkStageProgress[]> {
    const progress = await prisma.stageProgress.findMany({
      where: stageId ? { stageId: stageId } : {},
      orderBy: { recordedDate: "desc" },
    });
    return progress.map(
      (p) =>
        ({
          ...p,
          actualPercentage: Number(p.actualPercentage),
        }) as WorkStageProgress,
    );
  }

  async findProductionElements(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{ total: number; executed: number; sumProgress: number }> {
    const elements = await prisma.mapElementTechnicalData.findMany({
      where: { projectId, elementType: "TOWER" },
      select: { id: true, metadata: true },
    });

    if (elements.length === 0) return { total: 0, executed: 0, sumProgress: 0 };

    let targetElements = elements;
    if (siteName) {
      const normalizedSite = siteName.trim().toLowerCase();
      targetElements = elements.filter(
        (e: { id: string; metadata: unknown }) => {
          const meta = e.metadata as Record<string, unknown>;
          const trecho = meta?.trecho || meta?.Trecho || meta?.site || "";
          return String(trecho).trim().toLowerCase() === normalizedSite;
        },
      );
    }

    if (targetElements.length === 0)
      return { total: 0, executed: 0, sumProgress: 0 };

    const targetElementIds = targetElements.map((e: unknown) => e.id);

    const [progressStats, executedCount] = await Promise.all([
      prisma.mapElementProductionProgress.aggregate({
        where: { activityId, elementId: { in: targetElementIds } },
        _sum: { progressPercent: true },
      }),
      prisma.mapElementProductionProgress.count({
        where: {
          activityId,
          elementId: { in: targetElementIds },
          progressPercent: { gte: 100 },
        },
      }),
    ]);

    return {
      total: targetElements.length,
      executed: executedCount,
      sumProgress: Number(progressStats?._sum?.progressPercent || 0),
    };
  }

  async findProductionElementsWeighted(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{
    totalWeight: number;
    weightedProgress: number;
    totalCount: number;
    executedCount: number;
  }> {
    const elements = await prisma.mapElementTechnicalData.findMany({
      where: { projectId, elementType: "TOWER" },
      select: { id: true, metadata: true },
    });

    if (elements.length === 0)
      return {
        totalWeight: 0,
        weightedProgress: 0,
        totalCount: 0,
        executedCount: 0,
      };

    let targetElements = elements;
    if (siteName) {
      const normalizedSite = siteName.trim().toLowerCase();
      targetElements = elements.filter(
        (e: { id: string; metadata: unknown }) => {
          const meta = e.metadata as Record<string, unknown>;
          const trecho = meta?.trecho || meta?.Trecho || meta?.site || "";
          return String(trecho).trim().toLowerCase() === normalizedSite;
        },
      );
    }

    if (targetElements.length === 0)
      return {
        totalWeight: 0,
        weightedProgress: 0,
        totalCount: 0,
        executedCount: 0,
      };

    const targetElementIds = targetElements.map((e: unknown) => e.id);
    const progressRecords = await prisma.mapElementProductionProgress.findMany({
      where: { activityId, elementId: { in: targetElementIds } },
      select: { elementId: true, progressPercent: true },
    });

    const progressMap = new Map<string, number>();
    for (const pr of progressRecords) {
      progressMap.set(pr.elementId, Number(pr.progressPercent || 0));
    }

    let totalWeight = 0;
    let weightedProgress = 0;
    let executedCount = 0;

    for (const elem of targetElements) {
      const meta = elem.metadata as Record<string, unknown>;
      const weight = Number(
        meta?.pesoEstrutura || meta?.peso || meta?.weight || 1.0,
      );
      const progress = progressMap.get(elem.id) || 0;

      if (progress >= 100) executedCount++;

      totalWeight += weight;
      weightedProgress += weight * progress;
    }

    return {
      totalWeight,
      weightedProgress,
      totalCount: targetElements.length,
      executedCount,
    };
  }

  async verifyActivityExists(activityId: string): Promise<boolean> {
    const exists = await prisma.productionActivity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });
    return !!exists;
  }

  async findById(id: string): Promise<WorkStage | null> {
    const stage = await prisma.workStage.findUnique({
      where: { id },
      include: {
        stageProgress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        site: { include: { project: true } },
      },
    });
    return stage ? this.mapToWorkStage(stage) : null;
  }

  async verifySiteAccess(siteId: string, companyId: string): Promise<boolean> {
    const site = await prisma.site.findFirst({
      where: { id: siteId, project: { companyId } },
      select: { id: true },
    });
    return !!site;
  }

  async verifyProjectAccess(
    projectId: string,
    companyId: string,
  ): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId },
      select: { id: true },
    });
    return !!project;
  }

  async verifyStageAccess(
    stageId: string,
    companyId: string,
  ): Promise<boolean> {
    const stage = await prisma.workStage.findFirst({
      where: {
        id: stageId,
        OR: [{ project: { companyId } }, { site: { project: { companyId } } }],
      },
      select: { id: true },
    });
    return !!stage;
  }

  async verifyStageAccessBulk(
    ids: string[],
    companyId: string,
  ): Promise<boolean> {
    const count = await prisma.workStage.count({
      where: {
        id: { in: ids },
        OR: [{ project: { companyId } }, { site: { project: { companyId } } }],
      },
    });
    return count === ids.length;
  }

  async getMetadata(id: string): Promise<Record<string, unknown>> {
    const stage = await prisma.workStage.findUnique({
      where: { id },
      select: { metadata: true },
    });
    return (stage?.metadata as Record<string, unknown>) || {};
  }

  async findGoalsByProject(
    projectId: string,
  ): Promise<Record<string, unknown>[]> {
    const goals = await prisma.towerActivityGoal.findMany({
      where: { projectId },
      orderBy: [{ level: "asc" }, { order: "asc" }],
    });
    return goals as Record<string, unknown>[];
  }

  private mapToWorkStage(data: unknown): WorkStage {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      weight: Number(data.weight || 1.0),
      siteId: data.siteId,
      projectId: data.projectId,
      productionActivityId: data.productionActivityId,
      parentId: data.parentId,
      displayOrder: data.displayOrder,
      metadata: (data.metadata as Record<string, unknown>) || {},
      site: data.site,
      progress: (data.stageProgress ||
        data.progress ||
        []) as WorkStageProgress[],
    };
  }
}
