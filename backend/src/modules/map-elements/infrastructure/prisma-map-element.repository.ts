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
    const updated = await prisma.mapElementTechnicalData.update({
      where: { id },
      data: data as any,
    });

    // Sincronização com as novas tabelas se for torre
    if (updated.elementType === "TOWER") {
      await this.syncTower({
        projectId: updated.projectId,
        towerId: updated.externalId,
        companyId: updated.companyId,
        siteId: updated.siteId,
        metadata: updated.metadata,
        sequence: updated.sequence,
      });
    }

    return updated as unknown as MapElementTechnicalData;
  }

  private async performUpsert(
    projectId: string,
    externalId: string,
    data: any,
  ): Promise<MapElementTechnicalData> {
    // Upsert logic for externalId within a project
    const existing = await this.findByExternalId(projectId, externalId);
    let result;

    if (existing) {
      result = await prisma.mapElementTechnicalData.update({
        where: { id: existing.id },
        data: data as any,
      });
    } else {
      result = await prisma.mapElementTechnicalData.create({
        data: data as any,
      });
    }

    // Sincronização com as novas tabelas se for torre
    if (result.elementType === "TOWER") {
      await this.syncTower({
        projectId: result.projectId,
        towerId: result.externalId,
        companyId: result.companyId,
        siteId: result.siteId,
        metadata: result.metadata,
        sequence: result.sequence,
      });
    }

    return result as unknown as MapElementTechnicalData;
  }

  /**
   * Helper para sincronizar dados de torre entre a skeleton e as tabelas especializadas
   */
  private async syncTower(data: {
    projectId: string;
    towerId: string;
    companyId: string;
    siteId: string | null;
    metadata: any;
    sequence?: number;
  }) {
    const {
      projectId,
      towerId,
      companyId,
      siteId,
      metadata,
      sequence = 0,
    } = data;
    const meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;

    await prisma.towerProduction.upsert({
      where: { projectId_towerId: { projectId, towerId } },
      update: { companyId, siteId, metadata: meta, sequencia: sequence },
      create: {
        projectId,
        towerId,
        companyId,
        siteId,
        metadata: meta,
        sequencia: sequence,
      },
    });
  }

  async saveMany(
    elements: MapElementTechnicalData[],
  ): Promise<MapElementTechnicalData[]> {
    if (elements.length === 0) return [];

    const projectId = elements[0].projectId; // Assume same project for batch

    // Deduplicate elements by externalId (last wins) to avoid batch conflicts
    const uniqueElementsMap = new Map<string, MapElementTechnicalData>();
    elements.forEach((e) => {
      if (e.externalId) uniqueElementsMap.set(e.externalId, e);
    });
    const uniqueElements = Array.from(uniqueElementsMap.values());
    const externalIds = uniqueElements
      .map((e) => e.externalId)
      .filter(Boolean) as string[];

    // 1. Find existing elements to determine insert vs update
    const existingElements = await prisma.mapElementTechnicalData.findMany({
      where: {
        projectId,
        externalId: { in: externalIds },
      },
      select: { id: true, externalId: true },
    });

    const existingMap = new Map<string, string>();
    existingElements.forEach((e: { id: string; externalId: string }) =>
      existingMap.set(e.externalId, e.id),
    );

    const toCreate: any[] = [];
    const toUpdate: MapElementTechnicalData[] = [];

    for (const el of uniqueElements) {
      // 1. Defensively pick only valid schema fields
      // 2. Convert empty strings or nulls to undefined to let Prisma omit them (ensures DB NULL)
      const sanitizedEl: any = {
        companyId: el.companyId,
        projectId: el.projectId,
        siteId: el.siteId && String(el.siteId).trim() !== "" ? el.siteId : null,
        documentId:
          el.documentId && String(el.documentId).trim() !== ""
            ? el.documentId
            : null,
        elementType: el.elementType,
        externalId: String(el.externalId),
        name: el.name,
        description: el.description,
        sequence: Number(el.sequence) || 0,
        latitude: el.latitude,
        longitude: el.longitude,
        elevation: el.elevation,
        metadata: el.metadata || {},
        displaySettings: el.displaySettings || {},
        geometry: el.geometry,
        path: el.path,
      };

      if (existingMap.has(el.externalId)) {
        // Enforce ID from DB to ensure update works
        const dbId = existingMap.get(el.externalId);
        toUpdate.push({ ...sanitizedEl, id: dbId! });
      } else {
        // New element - id will be generated by cuid()
        toCreate.push(sanitizedEl);
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
            }),
          ),
        );
      }
    }

    // 4. Sincronização em lote para torres
    const towers = uniqueElements.filter((el) => el.elementType === "TOWER");
    if (towers.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < towers.length; i += BATCH_SIZE) {
        const batch = towers.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((el) =>
            this.syncTower({
              projectId: el.projectId,
              towerId: el.externalId,
              companyId: el.companyId,
              siteId: el.siteId,
              metadata: el.metadata,
              sequence: Number(el.sequence) || 0,
            }),
          ),
        );
      }
    }

    // 4. Return correct data (fetch again or construct)
    // For performance, we can just return what we have, or re-fetch if needed.
    // Re-fetching ensures we have generated IDs for new items.
    return (await prisma.mapElementTechnicalData.findMany({
      where: {
        projectId,
        externalId: { in: externalIds as string[] },
      },
    })) as unknown as MapElementTechnicalData[];
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
    // Try to find the element in either legacy or production table
    const legacy = await prisma.mapElementTechnicalData.findUnique({
      where: { id },
      select: { projectId: true, externalId: true },
    });

    const production = await prisma.towerProduction.findUnique({
      where: { id },
      select: { projectId: true, towerId: true },
    });

    if (!legacy && !production) return false;

    const projectId = legacy?.projectId || production?.projectId;
    const towerId = legacy?.externalId || production?.towerId;

    if (!projectId || !towerId) return false;

    await prisma.$transaction([
      prisma.towerProduction.deleteMany({
        where: { projectId, towerId },
      }),
      // NÃO deletar TowerConstruction — dados técnicos são independentes
      prisma.towerActivityGoal.deleteMany({
        where: { projectId, towerId },
      }),
      prisma.mapElementTechnicalData.deleteMany({
        where: { id: legacy?.id || "not-found" },
      }),
    ]);
    return true;
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    // 1. Identify which IDs are from legacy and which are from new TowerProduction
    const legacyElements = await prisma.mapElementTechnicalData.findMany({
      where: { id: { in: ids } },
      select: { id: true, projectId: true, externalId: true },
    });

    const productionElements = await prisma.towerProduction.findMany({
      where: { id: { in: ids } },
      select: { id: true, projectId: true, towerId: true },
    });

    const legacyIds = legacyElements.map((e: any) => e.id);
    const productionIds = productionElements.map((e: any) => e.id);

    // Group by projectId for efficient deletion in related tables
    const projectsMap = new Map<string, Set<string>>();

    legacyElements.forEach((e: any) => {
      const set = projectsMap.get(e.projectId) || new Set<string>();
      set.add(e.externalId);
      projectsMap.set(e.projectId, set);
    });

    productionElements.forEach((e: any) => {
      const set = projectsMap.get(e.projectId) || new Set<string>();
      set.add(e.towerId);
      projectsMap.set(e.projectId, set);
    });

    if (
      projectsMap.size === 0 &&
      legacyIds.length === 0 &&
      productionIds.length === 0
    ) {
      return 0;
    }

    await prisma.$transaction(async (tx) => {
      for (const [projectId, externalIdsSet] of projectsMap.entries()) {
        const externalIds = Array.from(externalIdsSet);
        await tx.towerProduction.deleteMany({
          where: { projectId, towerId: { in: externalIds } },
        });
        // NÃO deletar TowerConstruction — dados técnicos são independentes
        await tx.towerActivityGoal.deleteMany({
          where: { projectId, towerId: { in: externalIds } },
        });
      }

      if (legacyIds.length > 0) {
        await tx.mapElementTechnicalData.deleteMany({
          where: { id: { in: legacyIds } },
        });
      }

      if (productionIds.length > 0) {
        // Should already be deleted by the loop above via towerId,
        // but we ensure it here just to be safe if direct ID deletion is expected
        await tx.towerProduction.deleteMany({
          where: { id: { in: productionIds } },
        });
      }
    });

    // Return the unique count of items intented to be removed
    const uniqueElementIdentifiers = new Set([...legacyIds, ...productionIds]);
    return uniqueElementIdentifiers.size;
  }

  async deleteByProject(projectId: string): Promise<number> {
    const [count] = await prisma.$transaction([
      prisma.towerProduction.deleteMany({
        where: { projectId },
      }),
      // NÃO deletar TowerConstruction — dados técnicos são independentes
      prisma.towerActivityGoal.deleteMany({
        where: { projectId },
      }),
      prisma.mapElementTechnicalData.deleteMany({
        where: { projectId },
      }),
    ]);
    return count.count;
  }

  async getProjectCompanyId(projectId: string): Promise<string | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true },
    });
    return project?.companyId || null;
  }
}
