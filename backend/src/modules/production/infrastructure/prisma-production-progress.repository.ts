import { prisma } from "@/lib/prisma/client";
import { MapElementProductionProgress } from "@prisma/client";
import {
  ProductionProgressRepository,
  ActivityStatus,
} from "../domain/production.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import { ProductionMapper } from "./prisma-production.mapper";

export class PrismaProductionProgressRepository implements ProductionProgressRepository {
  async save(progress: ProductionProgress): Promise<ProductionProgress> {
    const dataToSave = {
      currentStatus: progress.currentStatus,
      progressPercent: progress.progressPercent,
      startDate: progress.startDate,
      endDate: progress.endDate,
      history: progress.history as any, // Prisma expects JsonValue, compatible with our ProgressHistoryEntry[]
      dailyProduction: progress.dailyProduction as any,
      requiresApproval: progress.requiresApproval,
      approvalReason: progress.approvalReason,
    };

    if (progress.id) {
      const res = await prisma.mapElementProductionProgress.update({
        where: { id: progress.id },
        data: dataToSave,
        include: { productionActivity: true },
      });
      return ProductionMapper.toDomain(res);
    }

    return this.performUpsert(progress.elementId, progress.activityId, {
      ...dataToSave,
      projectId: progress.projectId,
      elementId: progress.elementId,
      activityId: progress.activityId,
    });
  }

  async saveMany(progresses: ProductionProgress[]): Promise<void> {
    if (progresses.length === 0) return;

    const transactions = progresses.map((progress) => {
      const dataToSave = {
        currentStatus: progress.currentStatus,
        progressPercent: progress.progressPercent,
        startDate: progress.startDate,
        endDate: progress.endDate,
        history: progress.history as any,
        dailyProduction: progress.dailyProduction as any,
        requiresApproval: progress.requiresApproval,
        approvalReason: progress.approvalReason,
        projectId: progress.projectId,
        elementId: progress.elementId,
        activityId: progress.activityId,
      };

      return prisma.mapElementProductionProgress.upsert({
        where: {
          elementId_activityId: {
            elementId: progress.elementId,
            activityId: progress.activityId,
          },
        },
        update: dataToSave,
        create: dataToSave,
      });
    });

    await prisma.$transaction(transactions);
  }

  private async performUpsert(
    elementId: string,
    activityId: string,
    data: Record<string, unknown>,
  ): Promise<ProductionProgress> {
    const existing = await prisma.mapElementProductionProgress.findUnique({
      where: { elementId_activityId: { elementId, activityId } },
      include: { productionActivity: true },
    });

    if (existing) {
      const updateData = { ...data };
      delete updateData["projectId"];
      delete updateData["elementId"];
      delete updateData["activityId"];

      const res = await prisma.mapElementProductionProgress.update({
        where: { id: existing.id },
        data: updateData as any,
        include: { productionActivity: true },
      });
      return ProductionMapper.toDomain(res);
    }

    const res = await prisma.mapElementProductionProgress.create({
      data: data as any,
      include: { productionActivity: true },
    });
    return ProductionMapper.toDomain(res);
  }

  async findById(id: string): Promise<ProductionProgress | null> {
    const res = await prisma.mapElementProductionProgress.findUnique({
      where: { id },
      include: { productionActivity: true },
    });
    if (!res) return null;
    return ProductionMapper.toDomain(res);
  }

  async findByElement(elementId: string): Promise<ProductionProgress[]> {
    const results = await prisma.mapElementProductionProgress.findMany({
      where: { elementId },
      include: { productionActivity: true },
    });
    return results.map((res: MapElementProductionProgress) =>
      ProductionMapper.toDomain(res),
    );
  }

  async findByElementsBatch(
    elementIds: string[],
  ): Promise<ProductionProgress[]> {
    const results = await prisma.mapElementProductionProgress.findMany({
      where: { elementId: { in: elementIds } },
      include: { productionActivity: true },
    });

    return results.map((res: MapElementProductionProgress) =>
      ProductionMapper.toDomain(res),
    );
  }

  async findByActivity(
    projectId: string,
    activityId: string,
  ): Promise<ProductionProgress[]> {
    const results = await prisma.mapElementProductionProgress.findMany({
      where: { projectId, activityId },
      include: { productionActivity: true },
    });
    return results.map((res: MapElementProductionProgress) =>
      ProductionMapper.toDomain(res),
    );
  }

  async findPendingLogs(
    companyId?: string | null,
  ): Promise<ProductionProgress[]> {
    const where: Record<string, unknown> = { currentStatus: "PENDING" };
    if (companyId) where["project"] = { companyId };

    const results = await prisma.mapElementProductionProgress.findMany({
      where,
      include: {
        productionActivity: true,
        mapElementTechnicalData: {
          select: { name: true, externalId: true, elementType: true },
        },
        project: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return results.map((res: MapElementProductionProgress) =>
      ProductionMapper.toDomain(res),
    );
  }

  async findProgress(
    elementId: string,
    activityId?: string,
  ): Promise<ProductionProgress | null> {
    const where: Record<string, unknown> = { elementId };
    if (activityId) where["activityId"] = activityId;

    const res = await prisma.mapElementProductionProgress.findFirst({
      where,
      include: {
        productionActivity: true,
        mapElementTechnicalData: { select: { projectId: true } },
      },
    });

    if (!res) return null;

    return ProductionMapper.toDomain({
      ...res,
      projectId: res.mapElementTechnicalData?.projectId || res.projectId,
    } as any);
  }
}
