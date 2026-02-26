import { prisma } from "@/lib/prisma/client";
import { AnchorRepository } from "../domain/anchor.repository";

export class PrismaAnchorRepository implements AnchorRepository {
  async findFirst(where: unknown): Promise<any | null> {
    return prisma.model3DAnchor.findFirst({ where });
  }

  async findMany(where: unknown): Promise<any[]> {
    return prisma.model3DAnchor.findMany({ where });
  }

  async upsert(where: unknown, update: unknown, create: unknown): Promise<unknown> {
    return prisma.model3DAnchor.upsert({ where, update, create });
  }

  async delete(where: unknown): Promise<void> {
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
    where: unknown;
    update: unknown;
    create: unknown;
  }): Promise<unknown> {
    return prisma.mapElementTechnicalData.upsert(params);
  }

  // Legacy support
  async findLegacyMany(where: unknown): Promise<any[]> {
    return (prisma as unknown).modelAnchors.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async createLegacy(data: unknown): Promise<unknown> {
    return (prisma as unknown).modelAnchors.create({ data });
  }

  async deleteLegacy(id: string): Promise<void> {
    await (prisma as unknown).modelAnchors.delete({ where: { id } });
  }
}
