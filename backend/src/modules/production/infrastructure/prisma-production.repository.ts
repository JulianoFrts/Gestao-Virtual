import { prisma } from "@/lib/prisma/client";
import {
  ProductionRepository,
  ActivityStatus,
} from "../domain/production.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import {
  ProductionConfigRepository,
  DelayCostConfig,
} from "../domain/production-config.repository";

export class PrismaProductionRepository
  implements ProductionRepository, ProductionConfigRepository {
  async save(progress: ProductionProgress): Promise<ProductionProgress> {
    const dataToSave: any = {
      currentStatus: progress.currentStatus,
      progressPercent: progress.progressPercent,
      startDate: progress.startDate,
      endDate: progress.endDate,
      history: progress.history,
      dailyProduction: progress.dailyProduction,
      requiresApproval: progress.requiresApproval,
      approvalReason: progress.approvalReason,
    };

    if (progress.id) {
      const res = await prisma.mapElementProductionProgress.update({
        where: { id: progress.id },
        data: dataToSave,
      });
      return new ProductionProgress(res as any);
    }

    // Para novos registros, precisamos dos IDs de relação
    return this.performUpsert(progress.elementId, progress.activityId, {
      ...dataToSave,
      projectId: progress.projectId,
      elementId: progress.elementId,
      activityId: progress.activityId,
    });
  }

  private async performUpsert(
    elementId: string,
    activityId: string,
    data: any,
  ): Promise<ProductionProgress> {
    const existing = await prisma.mapElementProductionProgress.findUnique({
      where: { elementId_activityId: { elementId, activityId } },
    });

    if (existing) {
      const { projectId, elementId: elId, activityId: actId, ...updateData } = data;
      const res = await prisma.mapElementProductionProgress.update({
        where: { id: existing.id },
        data: updateData,
      });
      return new ProductionProgress(res as any);
    }

    const res = await prisma.mapElementProductionProgress.create({
      data: data,
    });
    return new ProductionProgress(res as any);
  }

  async findById(id: string): Promise<ProductionProgress | null> {
    const res = await prisma.mapElementProductionProgress.findUnique({
      where: { id },
    });
    if (!res) return null;
    return new ProductionProgress({
      ...res,
      currentStatus: res.currentStatus as ActivityStatus,
      progressPercent: Number(res.progressPercent),
      history: res.history as any[],
      dailyProduction: res.dailyProduction as any,
    } as any);
  }

  async findByElement(elementId: string): Promise<ProductionProgress[]> {
    const results = await prisma.mapElementProductionProgress.findMany({
      where: { elementId },
      include: { activity: true }
    });
    return results.map((res: any) => new ProductionProgress({
      ...res,
      projectId: (res as any).projectId,
      currentStatus: res.currentStatus as ActivityStatus,
      progressPercent: Number(res.progressPercent),
      history: res.history as any[],
      dailyProduction: res.dailyProduction as any,
    } as any));
  }

  async findByActivity(
    projectId: string,
    activityId: string,
  ): Promise<ProductionProgress[]> {
    const results = await prisma.mapElementProductionProgress.findMany({
      where: { projectId, activityId },
    });
    return results.map((res: any) => new ProductionProgress(res as any));
  }

  async findElementsWithProgress(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
  ): Promise<any[]> {
    const where: any = { elementType: "TOWER" };
    if (projectId && projectId !== "all") where.projectId = projectId;
    if (companyId) where.companyId = companyId;

    if (siteId && siteId !== "all") {
      if (siteId === "none") {
        where.OR = [
          { documentId: null },
          { document: { siteId: null } }
        ];
      } else {
        // Filtering through the document relation is safer as towers are imported via KMZ (Document)
        // which is linked to a Site.
        where.document = { siteId };
      }
    }

    return await prisma.mapElementTechnicalData.findMany({
      where,
      orderBy: { sequence: "asc" },
      include: {
        productionProgress: {
          include: {
            activity: true,
          },
        },
        activitySchedules: true,
      },
    });
  }
  async findLinkedActivityIds(projectId: string, siteId?: string): Promise<string[]> {
    const where: any = {
      productionActivityId: { not: null },
    };

    if (siteId && siteId !== "all") {
      where.siteId = siteId;
    } else {
      where.site = { projectId };
    }

    const stages = await prisma.workStage.findMany({
      where,
      select: { productionActivityId: true },
    });

    return stages
      .map((s: any) => s.productionActivityId)
      .filter((id: any): id is string => !!id);
  }

  async findSchedule(elementId: string, activityId: string): Promise<any> {
    return await prisma.activitySchedule.findFirst({
      where: { elementId, activityId },
    });
  }

  async syncWorkStages(
    towerId: string,
    activityId: string,
    projectId: string,
    updatedBy: string,
  ): Promise<void> {
    try {
      const element = await prisma.mapElementTechnicalData.findUnique({
        where: { id: towerId },
      });
      if (!element) return;

      const linkedStages = await (prisma as any).workStage.findMany({
        where: { productionActivityId: activityId },
      });

      for (const stage of linkedStages as any[]) {
        await this.syncWorkStageItem(stage, activityId, projectId, updatedBy);
      }
    } catch (error) {
      console.error("Error syncing work stages:", error);
    }
  }

  private async syncWorkStageItem(
    stage: any,
    activityId: string,
    projectId: string,
    updatedBy: string,
  ) {
    // Calculamos a média de progresso para a atividade neste escopo
    const aggregate = await prisma.mapElementProductionProgress.aggregate({
      where: {
        activityId,
        project: { id: projectId },
      },
      _avg: { progressPercent: true },
    });

    const avgProgress = aggregate._avg.progressPercent
      ? Number(aggregate._avg.progressPercent)
      : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.stageProgress.upsert({
      where: { id: `auto_${stage.id}_${today.getTime()}` },
      update: { actualPercentage: avgProgress, updatedById: updatedBy },
      create: {
        stageId: stage.id,
        actualPercentage: avgProgress,
        plannedPercentage: 0,
        recordedDate: today,
        updatedById: updatedBy,
        notes: "Sincronização Automática (Modelo DDD)",
      },
    });
  }

  async findPendingLogs(
    companyId?: string | null,
  ): Promise<ProductionProgress[]> {
    const where: any = { currentStatus: 'PENDING' };
    if (companyId) where.project = { companyId };

    const results = await prisma.mapElementProductionProgress.findMany({
      where,
      include: {
        activity: true,
        element: {
          select: { name: true, externalId: true, elementType: true },
        },
        project: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return results.map((res: any) => new ProductionProgress(res as any));
  }

  // Schedule Implementation
  async findScheduleByElement(
    elementId: string,
    activityId: string,
  ): Promise<any | null> {
    return await prisma.activitySchedule.findFirst({
      where: { elementId, activityId },
    });
  }

  async findScheduleById(id: string): Promise<any | null> {
    return await prisma.activitySchedule.findUnique({
      where: { id },
    });
  }

  async saveSchedule(data: any): Promise<any> {
    if (data.id) {
      return await prisma.activitySchedule.update({
        where: { id: data.id },
        data,
      });
    }
    return await prisma.activitySchedule.create({ data });
  }

  async deleteSchedule(id: string): Promise<void> {
    await prisma.activitySchedule.delete({ where: { id } });
  }

  async deleteSchedulesBatch(ids: string[]): Promise<number> {
    const result = await prisma.activitySchedule.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  async findSchedulesByScope(params: {
    projectId?: string;
    companyId?: string;
    elementId?: string;
    activityId?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]> {
    const where: any = {};

    if (params.projectId && params.projectId !== "all") {
      // Precisamos navegar via element relation
      where.element = { projectId: params.projectId };
    }

    if (params.elementId) {
      where.elementId = params.elementId;
    }

    if (params.companyId) {
      where.element = {
        ...where.element,
        companyId: params.companyId,
      };
    }

    if (params.activityId) {
      where.activityId = params.activityId;
    }

    if (params.dateRange) {
      where.AND = [
        { plannedStart: { lte: params.dateRange.end } },
        { plannedEnd: { gte: params.dateRange.start } },
      ];
    }

    return await prisma.activitySchedule.findMany({
      where,
      include: {
        element: { select: { id: true, externalId: true, name: true } },
        activity: { select: { name: true } },
      },
      orderBy: { plannedStart: "asc" },
    });
  }

  async splitSchedule(
    id: string,
    updateData: any,
    createData: any,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.activitySchedule.update({
        where: { id },
        data: updateData,
      }),
      prisma.activitySchedule.create({
        data: createData,
      }),
    ]);
  }

  async findElementProjectId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { projectId: true },
    });
    return element?.projectId || null;
  }

  async findElementCompanyId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { companyId: true },
    });
    return element?.companyId || null;
  }

  // Production Config Repository Methods
  async getDelayCostConfig(
    companyId: string,
    projectId: string,
  ): Promise<DelayCostConfig | null> {
    const config = await prisma.delayCostConfig.findUnique({
      where: { companyId_projectId: { companyId, projectId } },
    });
    if (!config) return null;
    return config as unknown as DelayCostConfig;
  }

  async upsertDelayCostConfig(data: DelayCostConfig): Promise<DelayCostConfig> {
    return (await prisma.delayCostConfig.upsert({
      where: {
        companyId_projectId: {
          companyId: data.companyId,
          projectId: data.projectId,
        },
      },
      update: {
        dailyCost: data.dailyCost,
        currency: data.currency,
        description: data.description,
        updatedById: data.updatedById,
      },
      create: {
        companyId: data.companyId,
        projectId: data.projectId,
        dailyCost: data.dailyCost,
        currency: data.currency,
        description: data.description,
        updatedById: data.updatedById,
      },
    })) as unknown as DelayCostConfig;
  }

  async listDelayReasons(projectId: string): Promise<any[]> {
    return await prisma.projectDelayReason.findMany({
      where: projectId === "all" ? {} : { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDelayReason(data: any): Promise<any> {
    return await prisma.projectDelayReason.create({
      data: {
        projectId: data.projectId,
        code: data.code,
        description: data.description,
        dailyCost: data.dailyCost,
        category: data.category,
        updatedById: data.updatedById,
      },
    });
  }

  async deleteDelayReason(id: string): Promise<void> {
    await prisma.projectDelayReason.delete({ where: { id } });
  }

  // Categories (ProductionCategory)
  // Schema: ProductionCategory has name, description, order. No projectId.
  async listCategories(): Promise<any[]> {
    return await prisma.productionCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        activities: {
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async createCategory(data: any): Promise<any> {
    return await prisma.productionCategory.create({ data });
  }

  // Activities (ProductionActivity)
  async listActivities(categoryId?: string): Promise<any[]> {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    return await prisma.productionActivity.findMany({
      where,
      orderBy: { order: "asc" },
      include: { category: true },
    });
  }

  async createActivity(data: any): Promise<any> {
    return await prisma.productionActivity.create({ data });
  }

  async findProgress(
    elementId: string,
    activityId?: string,
  ): Promise<ProductionProgress | null> {
    const where: any = { elementId };
    if (activityId) where.activityId = activityId;

    const res = await prisma.mapElementProductionProgress.findFirst({
      where,
      include: {
        activity: true,
        element: { select: { projectId: true } },
      },
    });

    if (!res) return null;

    return new ProductionProgress({
      ...res,
      projectId: res.element.projectId,
      currentStatus: res.currentStatus as ActivityStatus,
      progressPercent: Number(res.progressPercent),
      history: res.history as any[],
      dailyProduction: res.dailyProduction as any,
    } as any);
  }

  async findAllIAPs(): Promise<any[]> {
    return prisma.listIAP.findMany({
      orderBy: { iap: "asc" },
    });
  }
}
