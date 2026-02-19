import crypto from "node:crypto";
import { prisma } from "@/lib/prisma/client";
import { ProductionConfigRepository, DelayCostConfig } from "../domain/production-config.repository";

export class PrismaProductionConfigRepository implements ProductionConfigRepository {
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
        updatedBy: data.updatedById,
      },
      create: {
        id: crypto.randomUUID(),
        companyId: data.companyId,
        projectId: data.projectId,
        dailyCost: data.dailyCost,
        currency: data.currency,
        description: data.description,
        updatedBy: data.updatedById,
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
        id: crypto.randomUUID(),
        projectId: data.projectId,
        code: data.code,
        description: data.description,
        dailyCost: data.dailyCost,
        category: data.category,
        updatedBy: data.updatedById,
      },
    });
  }

  async deleteDelayReason(id: string): Promise<void> {
    await prisma.projectDelayReason.delete({ where: { id } });
  }
}
