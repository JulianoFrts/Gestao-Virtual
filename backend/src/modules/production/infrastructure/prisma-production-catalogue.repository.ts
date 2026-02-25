import { prisma } from "@/lib/prisma/client";
import {
  ProductionActivity,
  ProductionCatalogueRepository,
  ProductionCategory,
  ProductionIAP,
  ProductionUnitCost,
} from "../domain/production-catalogue.repository";

export class PrismaProductionCatalogueRepository implements ProductionCatalogueRepository {
  async listCategories(): Promise<ProductionCategory[]> {
    const results = await prisma.productionCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        productionActivities: {
          orderBy: { order: "asc" },
        },
      },
    });

    return results.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      order: cat.order,
      activities: cat.productionActivities.map((act: any) => ({
        id: act.id,
        categoryId: act.categoryId,
        name: act.name,
        description: act.description,
        weight: Number(act.weight),
        order: act.order,
      })),
    }));
  }

  async createCategory(
    data: Partial<ProductionCategory>,
  ): Promise<ProductionCategory> {
    const result = await prisma.productionCategory.create({
      data: data as any,
    });
    return result as unknown as ProductionCategory;
  }

  async listActivities(categoryId?: string): Promise<ProductionActivity[]> {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    const results = await prisma.productionActivity.findMany({
      where,
      orderBy: { order: "asc" },
      include: { productionCategory: true },
    });

    return results.map((act: any) => ({
      id: act.id,
      categoryId: act.categoryId,
      name: act.name,
      description: act.description,
      weight: Number(act.weight),
      order: act.order,
      productionCategory: act.productionCategory,
    }));
  }

  async createActivity(
    data: Partial<ProductionActivity>,
  ): Promise<ProductionActivity> {
    const result = await prisma.productionActivity.create({
      data: data as any,
    });
    return {
      ...result,
      weight: Number(result.weight),
    } as ProductionActivity;
  }

  async findAllIAPs(): Promise<ProductionIAP[]> {
    const results = await prisma.listIap.findMany({
      orderBy: { iap: "asc" },
    });

    return results.map((iap: any) => ({
      id: iap.id,
      setor: iap.setor,
      peso: Number(iap.peso),
      iap: Number(iap.iap),
      cost: Number(iap.cost),
      description: iap.description,
    }));
  }

  async listUnitCosts(projectId: string): Promise<ProductionUnitCost[]> {
    const results = await prisma.activityUnitCost.findMany({
      where: { projectId },
      include: { productionActivity: true },
    });

    return results.map((cost: any) => ({
      id: cost.id,
      projectId: cost.projectId,
      activityId: cost.activityId,
      unitPrice: Number(cost.unitPrice),
      measureUnit: cost.measureUnit,
      activity: {
        ...cost.productionActivity,
        weight: Number(cost.productionActivity.weight),
      },
    }));
  }

  async upsertUnitCosts(
    projectId: string,
    costs: Partial<ProductionUnitCost>[],
  ): Promise<{ success: boolean; count: number }> {
    const results = [];
    const crypto = await import("node:crypto");
    for (const cost of costs) {
      if (!cost.activityId) continue;
      const result = await prisma.activityUnitCost.upsert({
        where: {
          projectId_activityId: {
            projectId,
            activityId: cost.activityId,
          },
        },
        update: {
          unitPrice: cost.unitPrice,
          measureUnit: cost.measureUnit,
        },
        create: {
          id: crypto.randomUUID(),
          projectId,
          activityId: cost.activityId,
          unitPrice: cost.unitPrice || 0,
          measureUnit: cost.measureUnit || "UN",
        },
      });
      results.push(result);
    }
    return { success: true, count: results.length };
  }
}
