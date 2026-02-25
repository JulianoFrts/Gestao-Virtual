import { prisma } from "@/lib/prisma/client";
import { AnchorRepository } from "../domain/anchor.repository";

export class PrismaAnchorRepository implements AnchorRepository {
  async findFirst(where: any): Promise<any | null> {
    return prisma.model3DAnchor.findFirst({ where });
  }

  async findMany(where: any): Promise<any[]> {
    return prisma.model3DAnchor.findMany({ where });
  }

  async upsert(where: any, update: any, create: any): Promise<any> {
    return prisma.model3DAnchor.upsert({ where, update, create });
  }

  async delete(where: any): Promise<void> {
    await prisma.model3DAnchor.delete({ where });
  }

  async findTechnicalData(
    projectId: string,
    externalId: string,
  ): Promise<any | null> {
    return prisma.mapElementTechnicalData.findUnique({
      where: { projectId_externalId: { projectId, externalId } },
    });
  }

  async listTechnicalData(projectId: string): Promise<any[]> {
    return prisma.mapElementTechnicalData.findMany({
      where: { projectId, elementType: "TOWER" },
    });
  }

  async upsertTechnicalData(params: {
    where: any;
    update: any;
    create: any;
  }): Promise<any> {
    return prisma.mapElementTechnicalData.upsert(params);
  }

  // Legacy support
  async findLegacyMany(where: any): Promise<any[]> {
    return (prisma as any).modelAnchors.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async createLegacy(data: any): Promise<any> {
    return (prisma as any).modelAnchors.create({ data });
  }

  async deleteLegacy(id: string): Promise<void> {
    await (prisma as any).modelAnchors.delete({ where: { id } });
  }
}
