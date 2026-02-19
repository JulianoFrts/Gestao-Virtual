import crypto from "node:crypto";
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
  implements ProductionRepository {
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
      include: { productionActivity: true }
    });
    return results.map((res: any) => new ProductionProgress({
      ...res,
      activity: res.productionActivity, // Mantém compatibilidade com a entidade se necessário
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
        where.constructionDocument = { siteId };
      }
    }

    const results = await prisma.mapElementTechnicalData.findMany({
      where,
      orderBy: { sequence: "asc" },
      include: {
        mapElementProductionProgress: {
          include: {
            productionActivity: true,
          },
        },
        activitySchedules: true,
      },
    });

    return results.map((el: any) => ({
      ...el,
      productionProgress: (el.mapElementProductionProgress || []).map((p: any) => ({
        ...p,
        activity: p.productionActivity
      }))
    }));
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

  async findPendingLogs(
    companyId?: string | null,
  ): Promise<ProductionProgress[]> {
    const where: any = { currentStatus: 'PENDING' };
    if (companyId) where.project = { companyId };

    const results = await prisma.mapElementProductionProgress.findMany({
      where,
      include: {
        productionActivity: true,
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
    const id = `auto_${stage.id}_${today.getTime()}`;

    await prisma.stageProgress.upsert({
      where: { id },
      update: { actualPercentage: avgProgress, updatedBy: updatedBy },
      create: {
        id,
        stageId: stage.id,
        actualPercentage: avgProgress,
        plannedPercentage: 0,
        recordedDate: today,
        updatedBy: updatedBy,
        notes: "Sincronização Automática (Modelo DDD)",
      },
    });
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

  async findProgress(
    elementId: string,
    activityId?: string,
  ): Promise<ProductionProgress | null> {
    const where: any = { elementId };
    if (activityId) where.activityId = activityId;

    const res = await prisma.mapElementProductionProgress.findFirst({
      where,
      include: {
        productionActivity: true,
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
}
