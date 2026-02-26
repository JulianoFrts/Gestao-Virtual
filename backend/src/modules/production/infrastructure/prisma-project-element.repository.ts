import { logger } from "@/lib/utils/logger";
import { prisma } from "@/lib/prisma/client";
import { ProjectElementRepository } from "../domain/project-element.repository";

interface ProjectFilters {
  projectId: string;
  companyId?: string | null;
  siteId?: string;
  skip?: number;
  take?: number;
}

export class PrismaProjectElementRepository implements ProjectElementRepository {
  async findById(id: string): Promise<unknown | null> {
    return prisma.mapElementTechnicalData.findUnique({
      where: { id },
    });
  }

  async findByIds(ids: string[]): Promise<unknown[]> {
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
  ): Promise<unknown[]> {
    const filters: ProjectFilters = { projectId, companyId, siteId, skip, take };
    const { mapWhere, towerWhere } = this.buildWhereClauses(filters);

    const [mapElements, towerProductions, towerConstructions] = await this.fetchAllSources(mapWhere, towerWhere);

    const allExternalIds = this.extractUniqueExternalIds(mapElements, towerProductions, towerConstructions);
    const virtualIds = Array.from(allExternalIds).map(extId => `virtual-${extId}`);

    const { progressMap, scheduleMap } = await this.fetchProgressAndSchedules(virtualIds);

    const mergedResults = this.mergeTowerData(
      allExternalIds,
      mapElements,
      towerProductions,
      towerConstructions,
      progressMap,
      scheduleMap
    );

    return this.sortAndPaginate(mergedResults, skip, take);
  }

  private buildWhereClauses(filters: ProjectFilters) {
    const base: Record<string, unknown> = {};
    if (filters.projectId && filters.projectId !== "all") base.projectId = filters.projectId;
    if (filters.companyId) base.companyId = filters.companyId;
    if (filters.siteId) base.siteId = filters.siteId;

    return {
      mapWhere: { ...base, elementType: "TOWER" },
      towerWhere: base
    };
  }

  private async fetchAllSources(mapWhere: Record<string, unknown>, towerWhere: Record<string, unknown>) {
    return Promise.all([
      prisma.mapElementTechnicalData.findMany({
        where: mapWhere as unknown,
        orderBy: { sequence: "asc" },
        include: {
          mapElementProductionProgress: { include: { productionActivity: true } },
          activitySchedules: true,
        },
      }),
      prisma.towerProduction.findMany({ where: towerWhere as unknown }),
      prisma.towerConstruction.findMany({ where: towerWhere as unknown }),
    ]);
  }

  private extractUniqueExternalIds(mapElements: unknown[], productions: unknown[], constructions: unknown[]) {
    const normalize = (id?: string | null) => id?.replace(/^Torre\s+/i, "").trim() || "";
    const ids = new Set<string>();
    mapElements.forEach(el => ids.add(normalize(el.externalId)));
    productions.forEach(tp => ids.add(normalize(tp.towerId)));
    constructions.forEach(tc => ids.add(normalize(tc.towerId)));
    ids.delete("");
    return ids;
  }

  private async fetchProgressAndSchedules(virtualIds: string[]) {
    const [progress, schedules] = await Promise.all([
      prisma.mapElementProductionProgress.findMany({
        where: { elementId: { in: virtualIds } },
        include: { productionActivity: true },
      }),
      prisma.activitySchedule.findMany({
        where: { elementId: { in: virtualIds } },
      }),
    ]);

    const progressMap = new Map<string, any[]>();
    progress.forEach(p => {
      if (!progressMap.has(p.elementId)) progressMap.set(p.elementId, []);
      progressMap.get(p.elementId)?.push({ ...p, activity: p.productionActivity });
    });

    const scheduleMap = new Map<string, any[]>();
    schedules.forEach(s => {
      if (s.elementId) {
        if (!scheduleMap.has(s.elementId)) scheduleMap.set(s.elementId, []);
        scheduleMap.get(s.elementId)?.push(s);
      }
    });

    return { progressMap, scheduleMap };
  }

  private mergeTowerData(
    allExternalIds: Set<string>,
    mapElements: unknown[],
    productions: unknown[],
    constructions: unknown[],
    progressMap: Map<string, any[]>,
    scheduleMap: Map<string, any[]>
  ) {
    const normalize = (id?: string | null) => id?.replace(/^Torre\s+/i, "").trim() || "";
    const mapElementsMap = new Map(mapElements.map(el => [normalize(el.externalId), el]));
    const productionsMap = new Map(productions.map(tp => [normalize(tp.towerId), tp]));
    const constructionsMap = new Map(constructions.map(tc => [normalize(tc.towerId), tc]));

    return Array.from(allExternalIds).map((extId, index) => {
      const legacy = mapElementsMap.get(extId);
      const prod = productionsMap.get(extId);
      const constr = constructionsMap.get(extId);
      const virtualId = `virtual-${extId}`;

      const mergedMetadata = this.resolveMetadata(prod, constr, legacy);

      return {
        id: (legacy as unknown)?.id || virtualId,
        elementId: (legacy as unknown)?.id || virtualId,
        externalId: extId,
        name: (legacy as unknown)?.name || (prod as unknown)?.metadata?.name || (constr as unknown)?.metadata?.name || extId,
        elementType: "TOWER",
        sequence: (legacy as unknown)?.sequence || (prod as unknown)?.sequencia || (constr as unknown)?.sequencia || (index + 1000),
        latitude: (legacy as unknown)?.latitude || (constr as unknown)?.metadata?.latitude || (prod as unknown)?.metadata?.latitude || null,
        longitude: (legacy as unknown)?.longitude || (constr as unknown)?.metadata?.longitude || (prod as unknown)?.metadata?.longitude || null,
        elevation: (legacy as unknown)?.elevation || (constr as unknown)?.metadata?.elevation || (prod as unknown)?.metadata?.elevation || null,
        metadata: mergedMetadata,
        productionProgress: progressMap.get(virtualId) || (legacy as unknown)?.mapElementProductionProgress || [],
        activitySchedules: scheduleMap.get(virtualId) || (legacy as unknown)?.activitySchedules || [],
      };
    });
  }

  private resolveMetadata(prod: unknown, constr: unknown, legacy: unknown) {
    const parse = (m: unknown) => {
        if (!m) return {};
        if (typeof m === "string") {
            try { return JSON.parse(m); } catch { return {}; }
        }
        return m;
    };
    const pMeta = parse(prod?.metadata);
    const cMeta = parse(constr?.metadata);
    const lMeta = parse(legacy?.metadata);

    return {
      ...pMeta, ...cMeta, ...lMeta,
      trecho: pMeta.trecho || cMeta.trecho || lMeta.trecho || "",
      towerType: legacy?.towerType || pMeta.towerType || cMeta.towerType || "Autoportante",
      totalConcreto: cMeta.peso_concreto || cMeta.pesoConcreto || 0,
      pesoArmacao: cMeta.peso_aco_1 || cMeta.aco1 || 0,
      pesoEstrutura: cMeta.peso_estrutura || cMeta.pesoEstrutura || 0,
      goForward: cMeta.distancia_vao || cMeta.vao || 0,
    };
  }

  private sortAndPaginate(results: unknown[], skip?: number, take?: number): unknown[] {
    const sorted = results.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    if (skip !== undefined && take !== undefined) return sorted.slice(skip, skip + take);
    if (take !== undefined) return sorted.slice(0, take);
    return sorted;
  }

  async findLinkedActivityIds(
    projectId: string,
    siteId?: string,
  ): Promise<string[]> {
    const where: Record<string, unknown> = {
      productionActivityId: { not: null },
    };

    if (siteId && siteId !== "all") {
      where.siteId = siteId;
    } else {
      where.site = { projectId };
    }

    const stages = await prisma.workStage.findMany({
      where: where as unknown,
      select: { productionActivityId: true },
    });

    return stages
      .map((s: unknown) => s.productionActivityId)
      .filter((id: string | null): id is string => !!id);
  }

  async findProjectId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { projectId: true },
    });

    if (element?.projectId) return element.projectId;

    if (elementId.startsWith("virtual-")) {
      return this.handleVirtualProjectId(elementId);
    }

    return null;
  }

  private async handleVirtualProjectId(elementId: string): Promise<string | null> {
    try {
      const materializedId = await this.materializeVirtualElement(elementId);
      const retry = await prisma.mapElementTechnicalData.findUnique({
        where: { id: materializedId || elementId },
        select: { projectId: true },
      });
      return retry?.projectId || null;
    } catch (error) {
      logger.error(`[PrismaProjectElementRepository] Error materializing ${elementId}:`, { error });
      return null;
    }
  }

  async findCompanyId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { companyId: true },
    });

    if (element?.companyId) return element.companyId;

    if (elementId.startsWith("virtual-")) {
      return this.handleVirtualCompanyId(elementId);
    }

    return null;
  }

  private async handleVirtualCompanyId(elementId: string): Promise<string | null> {
    try {
      const materializedId = await this.materializeVirtualElement(elementId);
      const retry = await prisma.mapElementTechnicalData.findUnique({
        where: { id: materializedId || elementId },
        select: { companyId: true },
      });
      return retry?.companyId || null;
    } catch (error) {
      logger.error(`[PrismaProjectElementRepository] Error materializing ${elementId}:`, { error });
      return null;
    }
  }

  async materializeVirtualElement(elementId: string): Promise<string | null> {
    if (!elementId.startsWith("virtual-")) return elementId;

    const externalId = elementId.replace("virtual-", "");

    const [production, construction] = await Promise.all([
      prisma.towerProduction.findFirst({ where: { towerId: externalId } }),
      prisma.towerConstruction.findFirst({ where: { towerId: externalId } }),
    ]);

    const source = production || construction;
    if (!source) return null;

    const existing = await prisma.mapElementTechnicalData.findFirst({
      where: { projectId: source.projectId, externalId: source.towerId },
    });

    if (existing) return existing.id;

    return this.createMaterializedElement(elementId, source);
  }

  private async createMaterializedElement(elementId: string, source: unknown): Promise<string | null> {
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
          metadata: (source.metadata as unknown) || {},
        },
      });
      return created.id;
    } catch (error: unknown) {
      if (error.code === "P2002") {
        const retry = await prisma.mapElementTechnicalData.findFirst({
          where: { projectId: source.projectId, externalId: source.towerId },
        });
        return retry?.id || null;
      }
      throw error;
    }
  }
}
