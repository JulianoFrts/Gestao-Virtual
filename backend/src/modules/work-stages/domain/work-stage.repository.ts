import { prisma } from "@/lib/prisma/client";

export interface WorkStageProgress {
  id: string;
  stageId: string;
  actualPercentage: number;
  recordedDate: Date;
  notes?: string | null;
}

export interface WorkStage {
  id: string;
  name: string;
  description?: string | null;
  weight?: number;
  siteId: string | null;
  projectId: string | null;
  productionActivityId: string | null;
  metadata?: any;
  site?: {
    projectId: string;
    name: string;
    project?: {
      companyId: string;
    };
  } | null;

  progress?: WorkStageProgress[];
}

export interface CreateWorkStageDTO {
  name: string;
  description?: string | null;
  siteId: string | null;
  projectId?: string | null;
  displayOrder: number;
  weight?: number;
  parentId?: string | null;
  productionActivityId?: string | null;
  metadata?: any;
}

export interface WorkStageRepository {
  findLinkedStagesBySite(
    siteId: string,
    companyId?: string,
  ): Promise<WorkStage[]>;
  findLinkedStagesByProjectId(
    projectId: string,
    companyId?: string,
  ): Promise<WorkStage[]>;
  saveProgress(
    progress: Partial<WorkStageProgress>,
  ): Promise<WorkStageProgress>;
  findProgressByDate(
    stageId: string,
    date: Date,
  ): Promise<WorkStageProgress | null>;
  findAll(params: {
    siteId?: string | null;
    projectId?: string | null;
    companyId?: string | null;
    linkedOnly?: boolean;
  }): Promise<WorkStage[]>;
  findAllBySiteId(siteId: string): Promise<WorkStage[]>;
  findAllByProjectId(projectId: string): Promise<WorkStage[]>;
  create(data: CreateWorkStageDTO): Promise<WorkStage>;
  update(id: string, data: Partial<CreateWorkStageDTO>): Promise<WorkStage>;
  listProgress(stageId?: string): Promise<WorkStageProgress[]>;
  findProductionElements(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<any[]>;
  findProductionElementsWeighted(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{ totalWeight: number; weightedProgress: number }>;
  verifyActivityExists(activityId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
  reorder(updates: { id: string; displayOrder: number }[]): Promise<void>;
  deleteBySite(siteId: string): Promise<void>;
}

export class PrismaWorkStageRepository implements WorkStageRepository {
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
    return stages.map(s => this.mapToWorkStage(s));
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
    return stages.map(s => this.mapToWorkStage(s));
  }

  async saveProgress(
    progress: Partial<WorkStageProgress>,
  ): Promise<WorkStageProgress> {
    if (progress.id) {
      const updateData: any = {};
      if (
        progress.actualPercentage !== undefined &&
        progress.actualPercentage !== null
      ) {
        updateData.actualPercentage = progress.actualPercentage;
      }
      if (progress.notes !== undefined) {
        updateData.notes = progress.notes;
      }
      if (progress.recordedDate) {
        updateData.recordedDate = progress.recordedDate;
      }

      const result = await prisma.stageProgress.update({
        where: { id: progress.id },
        data: updateData,
      });
      return {
        ...result,
        actualPercentage: Number(result.actualPercentage),
      } as WorkStageProgress;
    } else {
      const result = await prisma.stageProgress.create({
        data: {
          stageId: progress.stageId!,
          actualPercentage: progress.actualPercentage ?? 0,
          recordedDate: progress.recordedDate || new Date(),
          notes: progress.notes,
        },
      });
      return {
        ...result,
        actualPercentage: Number(result.actualPercentage),
      } as WorkStageProgress;
    }
  }

  async findProgressByDate(
    stageId: string,
    date: Date,
  ): Promise<WorkStageProgress | null> {
    const result = await prisma.stageProgress.findFirst({
      where: { stageId, recordedDate: date },
    });
    if (!result) return null;
    return {
      ...result,
      actualPercentage: Number(result.actualPercentage),
    } as WorkStageProgress;
  }

  async findAll(params: {
    siteId?: string | null;
    projectId?: string | null;
    companyId?: string | null;
    linkedOnly?: boolean;
  }): Promise<WorkStage[]> {
    const { siteId, projectId, linkedOnly } = params;

    const where: any = {};

    if (linkedOnly) {
      where.productionActivityId = { not: null };
    }

    if (siteId) {
      where.siteId = siteId;
    } else if (projectId) {
      where.OR = [
        { projectId: projectId },
        { site: { projectId: projectId } }
      ];
    }

    const stages = await prisma.workStage.findMany({
      where,
      include: {
        progress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        site: {
          include: {
            project: true
          }
        }
      },
      orderBy: { displayOrder: "asc" },
    });

    return stages.map(this.mapToWorkStage);
  }

  async findAllBySiteId(siteId: string): Promise<WorkStage[]> {
    const stages = await prisma.workStage.findMany({
      where: { siteId },
      include: {
        progress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return stages.map(this.mapToWorkStage);
  }

  async findAllByProjectId(projectId: string): Promise<WorkStage[]> {
    const stages = await prisma.workStage.findMany({
      where: {
        site: {
          projectId,
        },
      },
      include: {
        progress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        site: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    return stages.map(this.mapToWorkStage);
  }

  private mapToWorkStage(s: any): WorkStage {
    return {
      ...s,
      weight: s.weight ? Number(s.weight) : 1.0,
      progress: s.progress
        ? s.progress.map((p: any) => ({
          ...p,
          actualPercentage: Number(p.actualPercentage),
        }))
        : [],
    };
  }

  async create(data: CreateWorkStageDTO): Promise<WorkStage> {
    const result = await prisma.workStage.create({
      data: {
        name: data.name,
        description: data.description || null,
        siteId: data.siteId,
        projectId: data.projectId,
        displayOrder: data.displayOrder || 0,
        weight: data.weight || 1.0,
        parentId: data.parentId || null,
        productionActivityId: data.productionActivityId,
        metadata: (data.metadata || {}) as any,
      },
    });
    return this.mapToWorkStage(result);
  }

  async update(id: string, data: Partial<CreateWorkStageDTO>): Promise<WorkStage> {
    const result = await prisma.workStage.update({
      where: { id },
      data,
    });
    return this.mapToWorkStage(result);
  }

  async listProgress(stageId?: string): Promise<WorkStageProgress[]> {
    const results = await prisma.stageProgress.findMany({
      where: stageId ? { stageId } : {},
      orderBy: { recordedDate: "desc" },
    });
    return results.map((r) => ({
      ...r,
      actualPercentage: Number(r.actualPercentage),
    })) as WorkStageProgress[];
  }

  async findProductionElements(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<any[]> {
    const elementFilter: any = { projectId, elementType: "TOWER" };
    const elements = await prisma.mapElementTechnicalData.findMany({
      where: elementFilter,
      select: { id: true, metadata: true },
    });

    if (elements.length === 0) return [0, 0];

    let targetElementIds = elements.map(e => e.id);

    if (siteName) {
      const normalizedSite = siteName.trim().toLowerCase();
      const filteredElements = elements.filter(e => {
        const meta = e.metadata as any;
        const trecho = meta?.trecho || meta?.Trecho || meta?.site || "";
        return String(trecho).trim().toLowerCase() === normalizedSite;
      });

      if (filteredElements.length > 0) {
        targetElementIds = filteredElements.map(e => e.id);
      } else {
        targetElementIds = [];
      }
    }

    if (targetElementIds.length === 0) return [0, 0];

    const progressStats = await prisma.mapElementProductionProgress.aggregate({
      where: {
        activityId,
        elementId: { in: targetElementIds },
      },
      _sum: { progressPercent: true },
    });

    return [targetElementIds.length, Number(progressStats?._sum?.progressPercent || 0)];
  }

  async findProductionElementsWeighted(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{ totalWeight: number; weightedProgress: number }> {
    const elementFilter: any = { projectId, elementType: "TOWER" };
    const elements = await prisma.mapElementTechnicalData.findMany({
      where: elementFilter,
      select: { id: true, metadata: true },
    });

    if (elements.length === 0) return { totalWeight: 0, weightedProgress: 0 };

    let targetElements = elements;
    if (siteName) {
      const normalizedSite = siteName.trim().toLowerCase();
      const filtered = elements.filter(e => {
        const meta = e.metadata as any;
        const trecho = meta?.trecho || meta?.Trecho || meta?.site || "";
        return String(trecho).trim().toLowerCase() === normalizedSite;
      });
      if (filtered.length > 0) {
        targetElements = filtered;
      } else {
        targetElements = [];
      }
    }

    if (targetElements.length === 0) return { totalWeight: 0, weightedProgress: 0 };

    const targetElementIds = targetElements.map(e => e.id);
    const progressRecords = await prisma.mapElementProductionProgress.findMany({
      where: {
        activityId,
        elementId: { in: targetElementIds },
      },
      select: { elementId: true, progressPercent: true },
    });

    const progressMap = new Map<string, number>();
    for (const pr of progressRecords) {
      progressMap.set(pr.elementId, Number(pr.progressPercent || 0));
    }

    let totalWeight = 0;
    let weightedProgress = 0;

    for (const elem of targetElements) {
      const meta = elem.metadata as any;
      const weight = Number(meta?.pesoEstrutura || meta?.peso || meta?.weight || 1.0);
      const progress = progressMap.get(elem.id) || 0;

      totalWeight += weight;
      weightedProgress += weight * progress;
    }

    return { totalWeight, weightedProgress };
  }

  async verifyActivityExists(activityId: string): Promise<boolean> {
    const exists = await prisma.productionActivity.findUnique({
      where: { id: activityId },
      select: { id: true }
    });
    return !!exists;
  }

  async delete(id: string): Promise<void> {
    await prisma.workStage.delete({
      where: { id }
    });
  }

  async reorder(updates: { id: string; displayOrder: number }[]): Promise<void> {
    // Usando transação para garantir que todos os updates ocorram ou nenhum
    await prisma.$transaction(
      updates.map((update) =>
        prisma.workStage.update({
          where: { id: update.id },
          data: { displayOrder: update.displayOrder },
        }),
      ),
    );
  }

  async deleteBySite(siteId: string): Promise<void> {
    await prisma.workStage.deleteMany({
      where: { siteId }
    });
  }
}
