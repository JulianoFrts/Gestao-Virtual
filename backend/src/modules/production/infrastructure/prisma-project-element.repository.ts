import { prisma } from "@/lib/prisma/client";
import { ProjectElementRepository } from "../domain/project-element.repository";

export class PrismaProjectElementRepository implements ProjectElementRepository {
  async findById(id: string): Promise<any | null> {
    return prisma.mapElementTechnicalData.findUnique({
      where: { id },
    });
  }

  async findByIds(ids: string[]): Promise<any[]> {
    return prisma.mapElementTechnicalData.findMany({
      where: { id: { in: ids } },
    });
  }

  async findByProjectId(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
    skip?: number,
    take?: number,
  ): Promise<any[]> {
    const mapWhere: any = { elementType: "TOWER" };
    if (projectId && projectId !== "all") mapWhere.projectId = projectId;
    if (companyId) mapWhere.companyId = companyId;
    if (siteId) mapWhere.siteId = siteId;

    const towerWhere: any = {};
    if (projectId && projectId !== "all") towerWhere.projectId = projectId;
    if (companyId) towerWhere.companyId = companyId;
    if (siteId) towerWhere.siteId = siteId;

    // 1. Fetch from all three sources to ensure no tower is left behind
    const [mapElements, towerProductions, towerConstructions] =
      await Promise.all([
        prisma.mapElementTechnicalData.findMany({
          where: mapWhere,
          orderBy: { sequence: "asc" },
          include: {
            mapElementProductionProgress: {
              include: { productionActivity: true },
            },
            activitySchedules: true,
          },
        }),
        prisma.towerProduction.findMany({
          where: towerWhere,
        }),
        prisma.towerConstruction.findMany({
          where: towerWhere,
        }),
      ]);

    console.log(`[findByProjectId] Counts for ${projectId}:`, {
      mapElements: mapElements.length,
      towerProductions: towerProductions.length,
      towerConstructions: towerConstructions.length,
    });

    const normalizeId = (id: string | null | undefined) => {
      if (!id) return "";
      return id.replace(/^Torre\s+/i, "").trim();
    };

    const mapElementsMap = new Map(
      mapElements.map((el: any) => [normalizeId(el.externalId), el]),
    );
    const productionsMap = new Map(
      towerProductions.map((tp: any) => [normalizeId(tp.towerId), tp]),
    );
    const constructionsMap = new Map(
      towerConstructions.map((tc: any) => [normalizeId(tc.towerId), tc]),
    );

    // 2. Union by ID (normalized)
    const allExternalIds = new Set(
      [
        ...Array.from(mapElementsMap.keys()),
        ...Array.from(productionsMap.keys()),
        ...Array.from(constructionsMap.keys()),
      ].filter((id) => id !== null && id !== undefined && id !== ""),
    );

    const virtualIds = Array.from(allExternalIds).map(
      (extId) => `virtual-${extId}`,
    );

    const [progressRecords, scheduleRecords] = await Promise.all([
      prisma.mapElementProductionProgress.findMany({
        where: { elementId: { in: virtualIds } },
        include: { productionActivity: true },
      }),
      prisma.activitySchedule.findMany({
        where: { elementId: { in: virtualIds } },
      }),
    ]);

    const progressMap = new Map<string, any[]>();
    for (const record of progressRecords) {
      if (!progressMap.has(record.elementId)) {
        progressMap.set(record.elementId, []);
      }
      progressMap.get(record.elementId)?.push({
        ...record,
        activity: record.productionActivity,
      });
    }

    const scheduleMap = new Map<string, any[]>();
    for (const record of scheduleRecords) {
      if (!scheduleMap.has(record.elementId!)) {
        // Safe non-null assertion since we queried by it
        scheduleMap.set(record.elementId!, []);
      }
      scheduleMap.get(record.elementId!)?.push(record);
    }

    // 3. Merge results
    const mergedResults = Array.from(allExternalIds as Set<string>).map(
      (extId: string, index: number) => {
        const legacy = mapElementsMap.get(extId) as any;
        const production = productionsMap.get(extId) as any;
        const construction = constructionsMap.get(extId) as any;
        const virtualId = `virtual-${extId}`;

        const prodMetadata =
          production && typeof production.metadata === "string"
            ? JSON.parse(production.metadata as string)
            : (production?.metadata as any) || {};

        const constrMetadata = construction
          ? typeof construction.metadata === "string"
            ? JSON.parse(construction.metadata as string)
            : (construction.metadata as any) || {}
          : {};

        const legacyMetadata =
          legacy && typeof legacy.metadata === "string"
            ? JSON.parse(legacy.metadata as string)
            : (legacy?.metadata as any) || {};

        // Unified metadata following project standards
        const mergedMetadata = {
          ...prodMetadata,
          ...constrMetadata,
          ...legacyMetadata,
          trecho:
            prodMetadata.trecho ||
            constrMetadata.trecho ||
            legacyMetadata?.trecho ||
            "",
          towerType:
            legacy?.towerType ||
            prodMetadata.towerType ||
            prodMetadata.tower_type ||
            constrMetadata.towerType ||
            legacyMetadata?.towerType ||
            "Autoportante",
          tipificacaoEstrutura:
            legacyMetadata?.tipificacaoEstrutura ||
            constrMetadata.tipificacaoEstrutura ||
            prodMetadata.tipificacaoEstrutura ||
            "",
          totalConcreto:
            constrMetadata.peso_concreto || constrMetadata.pesoConcreto || 0,
          pesoArmacao:
            constrMetadata.peso_aco_1 ||
            constrMetadata.pesoAco1 ||
            constrMetadata.aco1 ||
            0,
          pesoEstrutura:
            constrMetadata.peso_estrutura || constrMetadata.pesoEstrutura || 0,
          goForward: constrMetadata.distancia_vao || constrMetadata.vao || 0,
        };

        return {
          id: legacy?.id || virtualId,
          elementId: legacy?.id || virtualId,
          externalId: extId,
          name:
            legacy?.name ||
            prodMetadata.name ||
            constrMetadata.name ||
            `${extId}`,
          elementType: "TOWER",
          sequence:
            legacy?.sequence ||
            production?.sequencia ||
            construction?.sequencia ||
            index + 1000,
          latitude:
            legacy?.latitude ||
            constrMetadata.latitude ||
            constrMetadata.lat ||
            prodMetadata.latitude ||
            prodMetadata.lat ||
            null,
          longitude:
            legacy?.longitude ||
            constrMetadata.longitude ||
            constrMetadata.lng ||
            prodMetadata.longitude ||
            prodMetadata.lng ||
            null,
          elevation:
            legacy?.elevation ||
            constrMetadata.elevacao ||
            constrMetadata.elevation ||
            prodMetadata.elevacao ||
            prodMetadata.elevation ||
            null,
          metadata: mergedMetadata,
          productionProgress:
            progressMap.get(virtualId) ||
            (legacy?.mapElementProductionProgress || []).map((p: any) => ({
              ...p,
              activity: p.productionActivity,
            })),
          activitySchedules:
            scheduleMap.get(virtualId) || legacy?.activitySchedules || [],
        };
      },
    );

    // 4. Sort and apply pagination if needed
    const sorted = mergedResults.sort((a, b) => a.sequence - b.sequence);

    if (skip !== undefined && take !== undefined) {
      return sorted.slice(skip, skip + take);
    }
    if (take !== undefined) {
      return sorted.slice(0, take);
    }

    return sorted;
  }

  async findLinkedActivityIds(
    projectId: string,
    siteId?: string,
  ): Promise<string[]> {
    const where: any = {
      productionActivityId: { not: null },
    };

    if (siteId && siteId !== "all") {
      where.siteId = siteId;
    } else {
      where.site = { projectId };
    }

    const stages = await prisma.workStage.findMany({
      where,
      select: { productionActivityId: true },
    });

    return stages
      .map((s: any) => s.productionActivityId)
      .filter((id: any): id is string => !!id);
  }

  async findProjectId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { projectId: true },
    });

    if (element?.projectId) return element.projectId;

    // Se for virtual, tenta materializar para garantir que o ID exista e retorne o projeto
    if (elementId.startsWith("virtual-")) {
      try {
        const materializedId = await this.materializeVirtualElement(elementId);
        const retry = await prisma.mapElementTechnicalData.findUnique({
          where: { id: materializedId || elementId },
          select: { projectId: true },
        });
        return retry?.projectId || null;
      } catch (error) {
        console.error(
          `[PrismaProjectElementRepository] Error materializing ${elementId}:`,
          error,
        );
      }
    }

    return null;
  }

  async findCompanyId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { companyId: true },
    });

    if (element?.companyId) return element.companyId;

    if (elementId.startsWith("virtual-")) {
      try {
        const materializedId = await this.materializeVirtualElement(elementId);
        const retry = await prisma.mapElementTechnicalData.findUnique({
          where: { id: materializedId || elementId },
          select: { companyId: true },
        });
        return retry?.companyId || null;
      } catch (error) {
        console.error(
          `[PrismaProjectElementRepository] Error materializing ${elementId}:`,
          error,
        );
      }
    }

    return null;
  }

  async materializeVirtualElement(elementId: string): Promise<string | null> {
    if (!elementId.startsWith("virtual-")) return elementId;

    const externalId = elementId.replace("virtual-", "");

    // 1. Buscar dados de origem em TowerProduction ou TowerConstruction
    const [production, construction] = await Promise.all([
      prisma.towerProduction.findFirst({
        where: { towerId: externalId },
      }),
      prisma.towerConstruction.findFirst({
        where: { towerId: externalId },
      }),
    ]);

    const source = production || construction;
    if (!source) {
      console.warn(
        `[materializeVirtualElement] Source data not found for ${elementId}`,
      );
      return null;
    }

    // 2. Verificar se já existe por (projectId, externalId) - Prevenção de duplicados e conflitos de ID
    const existing = await prisma.mapElementTechnicalData.findFirst({
      where: {
        projectId: source.projectId,
        externalId: source.towerId,
      },
    });

    if (existing) {
      // Se já existe mas com ID diferente, retornamos o ID real para que as tabelas de progresso/cronograma usem a FK correta.
      console.log(
        `[materializeVirtualElement] Element ${externalId} already exists with ID ${existing.id}`,
      );
      return existing.id;
    }

    // 3. Criar o registro definitivo no repositório de elementos
    try {
      const created = await prisma.mapElementTechnicalData.create({
        data: {
          id: elementId,
          externalId: source.towerId,
          projectId: source.projectId,
          companyId: source.companyId,
          siteId: source.siteId,
          sequence: source.sequencia,
          elementType: "TOWER",
          name: source.towerId,
          metadata: (source.metadata as any) || {},
        },
      });
      console.log(
        `[materializeVirtualElement] Successfully materialized ${elementId}`,
      );
      return created.id;
    } catch (error: any) {
      if (error.code === "P2002") {
        // Concorrência: alguém criou enquanto verificávamos? Busca novamente.
        const retry = await prisma.mapElementTechnicalData.findFirst({
          where: {
            projectId: source.projectId,
            externalId: source.towerId,
          },
        });
        return retry?.id || null;
      }
      throw error;
    }
  }
}
