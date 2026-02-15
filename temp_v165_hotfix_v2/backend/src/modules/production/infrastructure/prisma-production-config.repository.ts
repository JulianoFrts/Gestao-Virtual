import { prisma } from "@/lib/prisma/client";
import {
  ProductionConfigRepository,
  DelayCostConfig,
} from "../domain/production-config.repository";

export class PrismaProductionConfigRepository implements ProductionConfigRepository {
  async getDelayCostConfig(
    companyId: string,
    projectId: string,
  ): Promise<DelayCostConfig | null> {
    return prisma.delayCostConfig.findUnique({
      where: {
        companyId_projectId: {
          companyId,
          projectId,
        },
      },
    });
  }

  async upsertDelayCostConfig(data: DelayCostConfig): Promise<DelayCostConfig> {
    return prisma.delayCostConfig.upsert({
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
    });
  }

  async listDelayReasons(projectId: string): Promise<any[]> {
    return prisma.projectDelayReason.findMany({
      where: projectId === "all" ? {} : { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDelayReason(data: any): Promise<any> {
    return prisma.projectDelayReason.create({
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
    await prisma.projectDelayReason.delete({
      where: { id },
    });
  }

  async listCategories(): Promise<any[]> {
    return prisma.productionCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        activities: {
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async createCategory(data: any): Promise<any> {
    return prisma.productionCategory.create({
      data: {
        name: data.name,
        description: data.description,
        order: data.order || 0,
      },
    });
  }

  async listActivities(categoryId?: string): Promise<any[]> {
    return prisma.productionActivity.findMany({
      where: categoryId ? { categoryId } : {},
      orderBy: { order: "asc" },
      include: {
        category: true,
      },
    });
  }

  async createActivity(data: any): Promise<any> {
    return prisma.productionActivity.create({
      data: {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        weight: data.weight || 1.0,
        order: data.order || 0,
      },
    });
  }
}
