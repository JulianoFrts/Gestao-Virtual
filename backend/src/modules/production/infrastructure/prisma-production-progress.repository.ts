import { prisma } from "@/lib/prisma/client";
import {
  ProductionProgressRepository,
  ActivityStatus,
} from "../domain/production.repository";
import { ProductionProgress } from "../domain/production-progress.entity";

export class PrismaProductionProgressRepository implements ProductionProgressRepository {
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
      activity: res.productionActivity,
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
