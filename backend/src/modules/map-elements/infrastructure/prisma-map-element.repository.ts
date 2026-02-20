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
    if (elements.length === 0) return [];

    const projectId = elements[0].projectId; // Assume same project for batch
    
    // Deduplicate elements by externalId (last wins) to avoid batch conflicts
    const uniqueElementsMap = new Map<string, MapElementTechnicalData>();
    elements.forEach(e => {
      if (e.externalId) uniqueElementsMap.set(e.externalId, e);
    });
    const uniqueElements = Array.from(uniqueElementsMap.values());
    const externalIds = uniqueElements.map((e) => e.externalId).filter(Boolean) as string[];

    // 1. Find existing elements to determine insert vs update
    const existingElements = await prisma.mapElementTechnicalData.findMany({
      where: {
        projectId,
        externalId: { in: externalIds },
      },
      select: { id: true, externalId: true },
    });

    const existingMap = new Map<string, string>();
    existingElements.forEach((e: { id: string; externalId: string }) => existingMap.set(e.externalId, e.id));

    const toCreate: any[] = [];
    const toUpdate: MapElementTechnicalData[] = [];

    for (const el of uniqueElements) {
      if (existingMap.has(el.externalId)) {
        // Enforce ID from DB to ensure update works
        const dbId = existingMap.get(el.externalId);
        toUpdate.push({ ...el, id: dbId! });
      } else {
        // New element
        const data = { ...el }; // Remove id if present but invalid/empty
        delete (data as any).id;
        toCreate.push(data);
      }
    }

    // 2. Perform Batch Insert (Very Fast)
    if (toCreate.length > 0) {
      await prisma.mapElementTechnicalData.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    // 3. Perform Updates (Batched Parallel)
    // Prisma doesn't support bulk update with different data, so we batch them
    // to avoid saturating the connection pool.
    if (toUpdate.length > 0) {
      const BATCH_SIZE = 10;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((el) =>
            prisma.mapElementTechnicalData.update({
              where: { id: el.id },
              data: { ...el, id: undefined } as any,
            })
          )
        );
      }
    }

    // 4. Return correct data (fetch again or construct)
    // For performance, we can just return what we have, or re-fetch if needed.
    // Re-fetching ensures we have generated IDs for new items.
    return await prisma.mapElementTechnicalData.findMany({
      where: {
        projectId,
        externalId: { in: externalIds as string[] },
      },
    }) as unknown as MapElementTechnicalData[];
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
    companyId?: string,
    type?: MapElementType,
  ): Promise<MapElementTechnicalData[]> {
    const where: any = { projectId };
    if (companyId) where.companyId = companyId;
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

  async deleteMany(ids: string[]): Promise<number> {
    const result = await prisma.mapElementTechnicalData.deleteMany({
      where: {
        id: { in: ids },
      },
    });
    return result.count;
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
