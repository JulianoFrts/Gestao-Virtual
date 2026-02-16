import { prisma } from "@/lib/prisma/client";
import {
  MapElementTechnicalData,
  MapElementRepository,
  MapElementType,
} from "../domain/map-element.repository";

export class PrismaMapElementRepository implements MapElementRepository {
  async save(
    element: MapElementTechnicalData,
  ): Promise<MapElementTechnicalData> {
    const { id, ...data } = element;

    if (id) {
      return this.performUpdate(id, data);
    }

    return this.performUpsert(element.projectId, element.externalId, data);
  }

  private async performUpdate(
    id: string,
    data: any,
  ): Promise<MapElementTechnicalData> {
    return (await prisma.mapElementTechnicalData.update({
      where: { id },
      data: data as any,
    })) as unknown as MapElementTechnicalData;
  }

  private async performUpsert(
    projectId: string,
    externalId: string,
    data: any,
  ): Promise<MapElementTechnicalData> {
    // Upsert logic for externalId within a project
    const existing = await this.findByExternalId(projectId, externalId);
    if (existing) {
      return (await prisma.mapElementTechnicalData.update({
        where: { id: existing.id },
        data: data as any,
      })) as unknown as MapElementTechnicalData;
    }

    return (await prisma.mapElementTechnicalData.create({
      data: data as any,
    })) as unknown as MapElementTechnicalData;
  }

  async saveMany(
    elements: MapElementTechnicalData[],
  ): Promise<MapElementTechnicalData[]> {
    // Usar transação para evitar múltiplas conexões e saturação do pool
    return await prisma.$transaction(async (tx) => {
      const results: MapElementTechnicalData[] = [];
      for (const el of elements) {
        const { id, ...data } = el;

        if (id) {
          const updated = await tx.mapElementTechnicalData.update({
            where: { id },
            data: data as any,
          });
          results.push(updated as unknown as MapElementTechnicalData);
        } else {
          // Upsert logic logic manually inside transaction
          const existing = await tx.mapElementTechnicalData.findUnique({
            where: {
              projectId_externalId: {
                projectId: el.projectId,
                externalId: el.externalId
              }
            },
          });

          if (existing) {
            const updated = await tx.mapElementTechnicalData.update({
              where: { id: existing.id },
              data: data as any,
            });
            results.push(updated as unknown as MapElementTechnicalData);
          } else {
            const created = await tx.mapElementTechnicalData.create({
              data: data as any,
            });
            results.push(created as unknown as MapElementTechnicalData);
          }
        }
      }
      return results;
    }, {
      timeout: 30000 // Aumentar timeout para lotes grandes
    });
  }

  async findById(id: string): Promise<MapElementTechnicalData | null> {
    return (await prisma.mapElementTechnicalData.findUnique({
      where: { id },
    })) as unknown as MapElementTechnicalData | null;
  }

  async findByExternalId(
    projectId: string,
    externalId: string,
  ): Promise<MapElementTechnicalData | null> {
    if (!projectId || !externalId) {
      return null;
    }

    return (await prisma.mapElementTechnicalData.findUnique({
      where: { projectId_externalId: { projectId, externalId } },
    })) as unknown as MapElementTechnicalData | null;
  }

  async findByProject(
    projectId: string,
    type?: MapElementType,
  ): Promise<MapElementTechnicalData[]> {
    const where: any = { projectId };
    if (type) where.elementType = type;

    return (await prisma.mapElementTechnicalData.findMany({
      where,
      orderBy: { sequence: "asc" },
    })) as unknown as MapElementTechnicalData[];
  }

  async findByCompany(
    companyId: string,
    type?: MapElementType,
  ): Promise<MapElementTechnicalData[]> {
    const where: any = { companyId };
    if (type) where.elementType = type;

    return (await prisma.mapElementTechnicalData.findMany({
      where,
      orderBy: [{ projectId: "asc" }, { sequence: "asc" }],
    })) as unknown as MapElementTechnicalData[];
  }

  async findAll(
    type?: MapElementType,
    limit: number = 10000,
  ): Promise<MapElementTechnicalData[]> {
    const where: any = {};
    if (type) where.elementType = type;

    return (await prisma.mapElementTechnicalData.findMany({
      where,
      take: limit,
      orderBy: [
        { companyId: "asc" },
        { projectId: "asc" },
        { sequence: "asc" },
      ],
    })) as unknown as MapElementTechnicalData[];
  }

  async delete(id: string): Promise<boolean> {
    await prisma.mapElementTechnicalData.deleteMany({
      where: { id },
    });
    return true;
  }

  async deleteByProject(projectId: string): Promise<number> {
    const result = await prisma.mapElementTechnicalData.deleteMany({
      where: { projectId },
    });
    return result.count;
  }

  async getProjectCompanyId(projectId: string): Promise<string | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true },
    });
    return project?.companyId || null;
  }
}
