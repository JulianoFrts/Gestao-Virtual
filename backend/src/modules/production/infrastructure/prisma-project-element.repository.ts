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
    // 1. To paginate correctly by "sequence", we MUST query `MapElementTechnicalData` first
    const legacyWhere: any = {
      projectId,
      elementType: "TOWER",
    };
    if (companyId) legacyWhere.companyId = companyId;

    const queryArgs: any = {
      where: legacyWhere,
      orderBy: { sequence: "asc" },
      include: {
        mapElementProductionProgress: {
          include: {
            productionActivity: true,
          },
        },
        activitySchedules: true,
      },
    };

    if (skip !== undefined) queryArgs.skip = skip;
    if (take !== undefined) queryArgs.take = take;

    const legacyElements =
      await prisma.mapElementTechnicalData.findMany(queryArgs);
    const externalIds = legacyElements.map((el: any) => el.externalId);

    // 2. Fetch towers from the new TowerProduction table matching those externalIds
    const towerProductionWhere: any = {
      projectId,
      towerId: { in: externalIds },
    };
    if (companyId) towerProductionWhere.companyId = companyId;
    if (siteId && siteId !== "all" && siteId !== "none") {
      towerProductionWhere.siteId = siteId;
    }

    const towers = await prisma.towerProduction.findMany({
      where: towerProductionWhere,
    });

    const towersMap = new Map<string, any>(
      towers.map((t: any) => [t.towerId, t]),
    );

    // 3. Fetch technical data from TowerConstruction
    const towersConstruction = await prisma.towerConstruction.findMany({
      where: { projectId, towerId: { in: externalIds } },
    });

    const constructionMap = new Map<string, any>(
      towersConstruction.map((tc: any) => [tc.towerId, tc]),
    );

    // 4. Merge results prioritizing the sorted legacyElements order
    const mergedResults = legacyElements.map((legacy: any, index: number) => {
      const tower = towersMap.get(legacy.externalId) || {};
      const tc = constructionMap.get(legacy.externalId);

      const towerMetadata =
        tower && typeof tower.metadata === "string"
          ? JSON.parse(tower.metadata as string)
          : tower?.metadata || {};

      const tcMetadata = tc
        ? typeof tc.metadata === "string"
          ? JSON.parse(tc.metadata as string)
          : tc.metadata || {}
        : {};

      // Unified metadata following the project standards
      const mergedMetadata = {
        ...towerMetadata,
        ...tcMetadata,
        trecho: towerMetadata.trecho || legacy?.metadata?.trecho || "",
        towerType:
          towerMetadata.towerType ||
          legacy?.metadata?.towerType ||
          "Autoportante",
        tipificacaoEstrutura: tcMetadata.tipificacaoEstrutura || "",
        totalConcreto: tcMetadata.pesoConcreto || 0,
        pesoArmacao: tcMetadata.pesoAco1 || 0,
        pesoEstrutura: tcMetadata.pesoEstrutura || 0,
        goForward: tcMetadata.vao || 0,
      };

      return {
        id: legacy.id,
        elementId: legacy.id,
        externalId: legacy.externalId,
        name: `Torre ${legacy.externalId}`,
        elementType: "TOWER",
        sequence: Number(legacy.sequence) || index + 1000,
        latitude: tcMetadata.lat || null,
        longitude: tcMetadata.lng || null,
        elevation: tcMetadata.elevacao || null,
        metadata: mergedMetadata,
        productionProgress: (legacy.mapElementProductionProgress || []).map(
          (p: any) => ({
            ...p,
            activity: p.productionActivity,
          }),
        ),
        activitySchedules: legacy.activitySchedules || [],
      };
    });

    return mergedResults;
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
    return element?.projectId || null;
  }

  async findCompanyId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { companyId: true },
    });
    return element?.companyId || null;
  }
}
