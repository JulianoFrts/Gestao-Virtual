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
  siteId: string | null;
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
  siteId: string | null;
  displayOrder: number;
  productionActivityId?: string;
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
}

export class PrismaWorkStageRepository implements WorkStageRepository {
  async findLinkedStagesBySite(
    siteId: string,
    companyId?: string,
  ): Promise<WorkStage[]> {
    return await prisma.workStage.findMany({
      where: {
        siteId,
        productionActivityId: { not: null },
        site: {
          project: { companyId: companyId || undefined },
        },
      },
      include: { site: { include: { project: true } } },
    });
  }

  async findLinkedStagesByProjectId(
    projectId: string,
    companyId?: string,
  ): Promise<WorkStage[]> {
    return await prisma.workStage.findMany({
      where: {
        site: {
          projectId,
          project: { companyId: companyId || undefined },
        },
        productionActivityId: { not: null },
      },
      include: { site: { include: { project: true } } },
    });
  }

  async saveProgress(
    progress: Partial<WorkStageProgress>,
  ): Promise<WorkStageProgress> {
    if (progress.id) {
      // Build update data dynamically to avoid undefined values overriding or causing issues
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
      // If explicit date update is needed
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
      progress: s.progress
        ? s.progress.map((p: any) => ({
            ...p,
            actualPercentage: Number(p.actualPercentage),
          }))
        : [],
    };
  }

  async create(data: CreateWorkStageDTO): Promise<WorkStage> {
    return await prisma.workStage.create({
      data: {
        name: data.name,
        siteId: data.siteId,
        displayOrder: data.displayOrder,
        productionActivityId: data.productionActivityId,
        metadata: (data.metadata || {}) as any,
      },
    });
  }

  async update(id: string, data: Partial<CreateWorkStageDTO>): Promise<WorkStage> {
    const updateData: any = { ...data };
    if (updateData.metadata) {
       // metadata is handled generically
    }
    
    return await prisma.workStage.update({
      where: { id },
      data: updateData,
    });
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
    // 1. Fetch ALL towers for the project first (safest approach)
    const elementFilter: any = { projectId, elementType: "TOWER" };
    
    // We fetch ID and metadata to filter in memory
    const elements = await prisma.mapElementTechnicalData.findMany({
      where: elementFilter,
      select: { id: true, metadata: true },
    });

    if (elements.length === 0) return [0, 0];

    // 2. Filter in memory by siteName (trecho) if provided
    // This solves case-sensitivity issues: "TRECHO 1" vs "Trecho 1"
    let targetElementIds = elements.map(e => e.id);

    if (siteName) {
      const normalizedSite = siteName.trim().toLowerCase();
      
      const filteredElements = elements.filter(e => {
        const meta = e.metadata as any;
        const trecho = meta?.trecho || meta?.Trecho || meta?.site || "";
        return String(trecho).trim().toLowerCase() === normalizedSite;
      });

      // If filtering found matches, use them. 
      // If NO matches were found, it might be that towers don't have 'trecho' set. 
      // In that case, we fallback to using ALL towers to avoid zeroing out progress erroneously 
      // (assuming implied scope if metadata is missing).
      // However, if some matched and some didn't, we respect the filter.
      if (filteredElements.length > 0) {
        targetElementIds = filteredElements.map(e => e.id);
      } else {
         // OPTIONAL: If we want to be strict, we would return [0, 0].
         // But user feedback says "it works sometimes", implying data consistency issues.
         // If no towers match the site name, it's safer to return 0 elements 
         // BUT we should log this or handle it. 
         // For now, let's assume strict filtering: if provided siteName is not found, scope is empty.
         targetElementIds = [];
      }
    }

    if (targetElementIds.length === 0) return [0, 0];

    // 3. Aggregate progress for the target elements
    const progressStats = await prisma.mapElementProductionProgress.aggregate({
      where: {
        activityId,
        elementId: { in: targetElementIds },
      },
      _sum: { progressPercent: true },
    });

    return [targetElementIds.length, Number(progressStats?._sum?.progressPercent || 0)];
  }

  /**
   * Calcula o progresso ponderado dos elementos de produção.
   * Usa o peso (weight) de cada torre/atividade para calcular: 
   *   sum(peso * progresso%) / sum(peso)
   * 
   * Se não houver peso definido, assume peso 1.0 para cada elemento.
   */
  async findProductionElementsWeighted(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{ totalWeight: number; weightedProgress: number }> {
    // 1. Buscar todos os elementos (torres) do projeto
    const elementFilter: any = { projectId, elementType: "TOWER" };
    const elements = await prisma.mapElementTechnicalData.findMany({
      where: elementFilter,
      select: { id: true, metadata: true },
    });

    if (elements.length === 0) return { totalWeight: 0, weightedProgress: 0 };

    // 2. Filtrar por trecho (case-insensitive)
    let targetElements = elements;
    if (siteName) {
      const normalizedSite = siteName.trim().toLowerCase();
      const filtered = elements.filter(e => {
        const meta = e.metadata as any;
        const trecho = meta?.trecho || meta?.Trecho || meta?.site || "";
        return String(trecho).trim().toLowerCase() === normalizedSite;
      });
      // Se encontrou algo, usa; senão assume todos (fallback)
      if (filtered.length > 0) {
        targetElements = filtered;
      }
    }

    if (targetElements.length === 0) return { totalWeight: 0, weightedProgress: 0 };

    const targetElementIds = targetElements.map(e => e.id);

    // 3. Buscar progresso individual de cada elemento
    const progressRecords = await prisma.mapElementProductionProgress.findMany({
      where: {
        activityId,
        elementId: { in: targetElementIds },
      },
      select: { elementId: true, progressPercent: true },
    });

    // Criar mapa de progresso por elemento
    const progressMap = new Map<string, number>();
    for (const pr of progressRecords) {
      progressMap.set(pr.elementId, Number(pr.progressPercent || 0));
    }

    // 4. Calcular soma ponderada
    // Peso vem do metadata do elemento (se existir) ou é 1.0
    let totalWeight = 0;
    let weightedProgress = 0;

    for (const elem of targetElements) {
      const meta = elem.metadata as any;
      // Tentar pegar peso do metadata (pesoEstrutura, peso, weight)
      const weight = Number(meta?.pesoEstrutura || meta?.peso || meta?.weight || 1.0);
      const progress = progressMap.get(elem.id) || 0;

      totalWeight += weight;
      weightedProgress += weight * progress;
    }

    return { totalWeight, weightedProgress };
  }
}
