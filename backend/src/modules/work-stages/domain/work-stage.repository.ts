import { prisma } from "@/lib/prisma/client";
import { cacheService } from "@/services/cacheService";
import {
  WorkStageProgressRepository,
  PrismaWorkStageProgressRepository,
  WorkStageProgress,
} from "./work-stage-progress.repository";

const WORK_STAGES_CACHE_TTL = 300; // 5 minutos de cache para etapas (geralmente estáveis)
const PROGRESS_CACHE_TTL = 60; // 1 minuto para progresso em listagens gerais

export type { WorkStageProgress };

export interface WorkStage {
  id: string;
  name: string;
  description?: string | null;
  weight?: number;
  siteId: string | null;
  projectId: string | null;
  productionActivityId: string | null;
  parentId?: string | null;
  displayOrder: number;
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

export interface CreateWorkStageBulkItem {
  name: string;
  description?: string | null;
  weight?: number;
  displayOrder: number;
  productionActivityId?: string | null;
  metadata?: any;
  children?: CreateWorkStageBulkItem[];
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
  createBulk(
    projectId: string,
    siteId: string | undefined,
    data: CreateWorkStageBulkItem[],
  ): Promise<WorkStage[]>;
}

export class PrismaWorkStageRepository implements WorkStageRepository {
  private readonly progressRepo: WorkStageProgressRepository;

  constructor(progressRepo?: WorkStageProgressRepository) {
    this.progressRepo = progressRepo || new PrismaWorkStageProgressRepository();
  }
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

  async saveProgress(
    progress: Partial<WorkStageProgress>,
  ): Promise<WorkStageProgress> {
    return this.progressRepo.save(progress);
  }

  async findProgressByDate(
    stageId: string,
    date: Date,
  ): Promise<WorkStageProgress | null> {
    return this.progressRepo.findByDate(stageId, date);
  }

  async findAll(params: {
    siteId?: string | null;
    projectId?: string | null;
    companyId?: string | null;
    linkedOnly?: boolean;
  }): Promise<WorkStage[]> {
    const { siteId, projectId, companyId, linkedOnly } = params;

    // Tentar obter do cache primeiro
    const cacheKey = `work_stages:list:${projectId || "all"}:${siteId || "all"}:${linkedOnly || "false"}:${companyId || "all"}`;
    const cached = await cacheService.get<WorkStage[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {};

    if (linkedOnly) {
      where.productionActivityId = { not: null };
    }

    if (siteId && projectId) {
      // Atividades do canteiro OU atividades globais do projeto
      where.OR = [
        { siteId: siteId },
        {
          AND: [{ projectId: projectId }, { siteId: null }],
        },
      ];
    } else if (siteId) {
      where.siteId = siteId;
    } else if (projectId) {
      where.OR = [{ projectId: projectId }, { site: { projectId: projectId } }];
    }

    if (companyId) {
      where.project = { companyId: companyId };
    }

    const stages = await prisma.workStage.findMany({
      where,
      include: {
        stageProgress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        site: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    const result = stages.map(this.mapToWorkStage);

    // Salvar no cache (TTL curto se tiver progresso, longo se for apenas estrutura)
    await cacheService.set(
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
        stageProgress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        site: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    return stages.map(this.mapToWorkStage);
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
    await this.invalidateCache();
    return this.mapToWorkStage(result);
  }

  async update(
    id: string,
    data: Partial<CreateWorkStageDTO>,
  ): Promise<WorkStage> {
    const result = await prisma.workStage.update({
      where: { id },
      data,
    });
    await this.invalidateCache();
    return this.mapToWorkStage(result);
  }

  async listProgress(stageId?: string): Promise<WorkStageProgress[]> {
    return this.progressRepo.listProgress(stageId);
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

    let targetElementIds = elements.map((e: any) => e.id);

    if (siteName) {
      const normalizedSite = siteName.trim().toLowerCase();
      const filteredElements = elements.filter((e: any) => {
        const meta = e.metadata as any;
        const trecho = meta?.trecho || meta?.Trecho || meta?.site || "";
        return String(trecho).trim().toLowerCase() === normalizedSite;
      });

      if (filteredElements.length > 0) {
        targetElementIds = filteredElements.map((e: any) => e.id);
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

    return [
      targetElementIds.length,
      Number(progressStats?._sum?.progressPercent || 0),
    ];
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
      const filtered = elements.filter((e: any) => {
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

    if (targetElements.length === 0)
      return { totalWeight: 0, weightedProgress: 0 };

    const targetElementIds = targetElements.map((e: any) => e.id);
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
      const weight = Number(
        meta?.pesoEstrutura || meta?.peso || meta?.weight || 1.0,
      );
      const progress = progressMap.get(elem.id) || 0;

      totalWeight += weight;
      weightedProgress += weight * progress;
    }

    return { totalWeight, weightedProgress };
  }

  async verifyActivityExists(activityId: string): Promise<boolean> {
    const exists = await prisma.productionActivity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });
    return !!exists;
  }

  async delete(id: string): Promise<void> {
    await prisma.workStage.delete({
      where: { id },
    });
    await this.invalidateCache();
  }

  async reorder(
    updates: { id: string; displayOrder: number }[],
  ): Promise<void> {
    // Usando transação para garantir que todos os updates ocorram ou nenhum
    await prisma.$transaction(
      updates.map((update) =>
        prisma.workStage.update({
          where: { id: update.id },
          data: { displayOrder: update.displayOrder },
        }),
      ),
    );
    await this.invalidateCache();
  }

  async deleteBySite(siteId: string): Promise<void> {
    await prisma.workStage.deleteMany({
      where: { siteId },
    });
    await this.invalidateCache();
  }

  async createBulk(
    projectId: string,
    siteId: string | undefined,
    data: CreateWorkStageBulkItem[],
  ): Promise<WorkStage[]> {
    const results: WorkStage[] = [];

    // Usamos transação para garantir atomicidade e performance
    await prisma.$transaction(async (tx) => {
      // 1. Buscar etapas existentes para evitar duplicatas por nome
      const existingStages = await tx.workStage.findMany({
        where: {
          projectId,
          siteId: siteId || null,
        },
        select: { id: true, name: true, parentId: true },
      });

      const existingMap = new Map(
        existingStages.map((s) => [
          `${s.name.trim().toUpperCase()}-${s.parentId || "root"}`,
          s.id,
        ]),
      );

      for (const item of data) {
        const itemKey = `${item.name.trim().toUpperCase()}-root`;
        let parentId = existingMap.get(itemKey);

        if (!parentId) {
          // Criar o pai (Meta Mãe) se não existir
          const parent = await tx.workStage.create({
            data: {
              name: item.name,
              description: item.description,
              weight: item.weight ?? 1.0,
              displayOrder: item.displayOrder,
              productionActivityId: item.productionActivityId || null,
              siteId: siteId || null,
              projectId: projectId,
              metadata: item.metadata || {},
            },
          });
          parentId = parent.id;
          results.push(this.mapToWorkStage(parent));
        } else {
          // Opcional: Atualizar metadata/weight do pai existente
          const updatedParent = await tx.workStage.update({
            where: { id: parentId },
            data: {
              weight: item.weight ?? 1.0,
              displayOrder: item.displayOrder,
              productionActivityId: item.productionActivityId || null,
              metadata: (item.metadata || {}) as any,
            },
          });
          results.push(this.mapToWorkStage(updatedParent));
        }

        // Se tiver filhos, criar cada um vinculado ao pai
        if (item.children && item.children.length > 0) {
          for (const child of item.children) {
            const childKey = `${child.name.trim().toUpperCase()}-${parentId}`;
            const existingChildId = existingMap.get(childKey);

            if (!existingChildId) {
              const createdChild = await tx.workStage.create({
                data: {
                  name: child.name,
                  description: child.description,
                  weight: child.weight ?? 1.0,
                  displayOrder: child.displayOrder,
                  productionActivityId: child.productionActivityId || null,
                  siteId: siteId || null,
                  projectId: projectId,
                  parentId: parentId,
                  metadata: child.metadata || {},
                },
              });
              results.push(this.mapToWorkStage(createdChild));
            } else {
              // Atualizar filho existente
              const updatedChild = await tx.workStage.update({
                where: { id: existingChildId },
                data: {
                  weight: child.weight ?? 1.0,
                  displayOrder: child.displayOrder,
                  productionActivityId: child.productionActivityId || null,
                  metadata: (child.metadata || {}) as any,
                },
              });
              results.push(this.mapToWorkStage(updatedChild));
            }
          }
        }
      }
    });

    // Invalida o cache apenas UMA vez ao final de TODAS as inserções
    await this.invalidateCache();

    return results;
  }

  private async invalidateCache(): Promise<void> {
    await cacheService.delByPattern("work_stages:list:*");
  }

  private mapToWorkStage(data: any): WorkStage {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      weight: data.weight,
      siteId: data.siteId,
      projectId: data.projectId,
      productionActivityId: data.productionActivityId,
      parentId: data.parentId,
      displayOrder: data.displayOrder,
      metadata: data.metadata,
      site: data.site,
      progress: data.stageProgress || data.progress || [],
    };
  }
}
