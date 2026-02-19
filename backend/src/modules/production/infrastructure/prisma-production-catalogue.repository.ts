import { prisma } from "@/lib/prisma/client";
import { ProductionCatalogueRepository } from "../domain/production-catalogue.repository";

export class PrismaProductionCatalogueRepository implements ProductionCatalogueRepository {
  async listCategories(): Promise<any[]> {
    const results = await prisma.productionCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        productionActivities: {
          orderBy: { order: "asc" },
        },
      },
    });

    return results.map((cat: any) => ({
      ...cat,
      activities: cat.productionActivities
    }));
  }

  async createCategory(data: any): Promise<any> {
    return await prisma.productionCategory.create({ data });
  }

  async listActivities(categoryId?: string): Promise<any[]> {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    return await prisma.productionActivity.findMany({
      where,
      orderBy: { order: "asc" },
      include: { productionCategory: true },
    });
  }

  async createActivity(data: any): Promise<any> {
    return await prisma.productionActivity.create({ data });
  }

  async findAllIAPs(): Promise<any[]> {
    return prisma.listIap.findMany({
      orderBy: { iap: "asc" },
    });
  }

  async listUnitCosts(projectId: string): Promise<any[]> {
    const results = await prisma.activityUnitCost.findMany({
      where: { projectId },
      include: { productionActivity: true },
    });

    return results.map((cost: any) => ({
      ...cost,
      activity: cost.productionActivity
    }));
  }

  async upsertUnitCosts(projectId: string, costs: any[]): Promise<any> {
    const results = [];
    const crypto = require("node:crypto");
    for (const cost of costs) {
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
          unitPrice: cost.unitPrice,
          measureUnit: cost.measureUnit || "UN",
        },
      });
      results.push(result);
    }
    return { success: true, count: results.length };
  }
}
