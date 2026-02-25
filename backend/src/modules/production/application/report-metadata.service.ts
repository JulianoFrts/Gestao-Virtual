import { prisma } from "@/lib/prisma/client";

export interface PreviewIntervalParams {
  projectId: string;
  subPointType: "TORRE" | "VAO" | "TRECHO" | "GERAL" | "ESTRUTURA";
  subPoint: string;
  subPointEnd?: string;
  isMultiSelection: boolean;
  stageId?: string;
  companyId?: string;
}

export class ReportMetadataService {
  async previewInterval(params: PreviewIntervalParams): Promise<{
    expandedTowers: string[];
    finalLabel: string;
    metrics: { towers: number; km: string };
    details?: any[];
  }> {
    const {
      projectId,
      subPointType,
      subPoint,
      subPointEnd,
      isMultiSelection,
      stageId,
    } = params;

    let result: {
      expandedTowers: string[];
      finalLabel: string;
      metrics: { towers: number; km: string };
    };

    if (subPointType === "VAO" || subPointType === "TRECHO") {
      result = await this.handleSpanInterval(
        projectId,
        subPoint,
        isMultiSelection,
        subPointEnd,
      );
    } else if (subPointType === "TORRE" || subPointType === "ESTRUTURA") {
      result = await this.handleTowerInterval(
        projectId,
        subPoint,
        isMultiSelection,
        subPointEnd,
      );
    } else {
      result = {
        expandedTowers: [],
        finalLabel: subPoint,
        metrics: { towers: 0, km: "0.00" },
      };
    }

    // Se tivermos um stageId, vamos enriquecer com o progresso atual
    if (stageId && result.expandedTowers.length > 0) {
      const enrichedDetails = await this.getDetailedProgress(
        projectId,
        stageId,
        result.expandedTowers,
      );
      return {
        ...result,
        details: enrichedDetails,
      };
    }

    return result;
  }

  // Método para buscar progresso real
  private async getDetailedProgress(
    projectId: string,
    stageId: string,
    towerIds: string[],
  ) {
    const elements = await prisma.mapElementTechnicalData.findMany({
      where: {
        projectId,
        OR: [
          { id: { in: towerIds } },
          { externalId: { in: towerIds } },
          { name: { in: towerIds } },
        ],
      },
      include: {
        mapElementProductionProgress: {
          where: { activityId: stageId },
        },
      },
    });

    // Pre-indexar por id, externalId e name para O(1) lookup
    const byId = new Map<string, (typeof elements)[number]>();
    const byExternalId = new Map<string, (typeof elements)[number]>();
    const byName = new Map<string, (typeof elements)[number]>();

    for (const e of elements) {
      byId.set(e.id, e);
      if (e.externalId) byExternalId.set(e.externalId, e);
      if (e.name) byName.set(e.name, e);
    }

    return towerIds.map((id) => {
      const element = byId.get(id) || byExternalId.get(id) || byName.get(id);
      const progress = element?.mapElementProductionProgress?.[0];

      return {
        id,
        progress: progress?.progressPercent || 0,
        status:
          (progress?.status as "IN_PROGRESS" | "FINISHED" | "BLOCKED") ||
          "IN_PROGRESS",
      };
    });
  }

  private async handleSpanInterval(
    projectId: string,
    start: string,
    multi: boolean,
    end?: string,
  ) {
    const spans = await prisma.mapElementTechnicalData.findMany({
      where: { projectId, elementType: "SPAN" },
      orderBy: { sequence: "asc" },
    });

    const selected = this.sliceRange(spans, start, multi, end);
    if (selected.length === 0)
      return {
        expandedTowers: [],
        finalLabel: start,
        metrics: { towers: 0, km: "0.00" },
      };

    const uniqueTowers = new Set<string>();
    let totalMeters = 0;

    selected.forEach((s: any) => {
      const meta = (s as { metadata: Record<string, unknown> }).metadata;
      if (meta?.towerStartId) uniqueTowers.add(String(meta.towerStartId));
      if (meta?.towerEndId) uniqueTowers.add(String(meta.towerEndId));
      totalMeters += Number(meta?.spanLength || 0);
    });

    return {
      expandedTowers: Array.from(uniqueTowers),
      finalLabel:
        (multi && end
          ? `${selected[0].name || selected[0].externalId} a ${selected[selected.length - 1].name || selected[selected.length - 1].externalId}`
          : selected[0].name || selected[0].externalId) || start,
      metrics: {
        towers: uniqueTowers.size,
        km: (totalMeters / 1000).toFixed(2),
      },
    };
  }

  private async handleTowerInterval(
    projectId: string,
    start: string,
    multi: boolean,
    end?: string,
  ): Promise<{
    expandedTowers: string[];
    finalLabel: string;
    metrics: { towers: number; km: string };
  }> {
    const towers = await prisma.mapElementTechnicalData.findMany({
      where: { projectId, elementType: "TOWER" },
      orderBy: { sequence: "asc" },
    });

    const startIdx = this.findTowerIdx(towers, start);
    const endIdx = multi && end ? this.findTowerIdx(towers, end) : -1;

    if (multi && startIdx !== -1 && endIdx !== -1) {
      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      const range = towers.slice(minIdx, maxIdx + 1);
      return {
        expandedTowers: range.map(
          (t: {
            id: string;
            externalId?: string | null;
            name?: string | null;
          }) => t.externalId || t.name || t.id,
        ),
        finalLabel: `${towers[minIdx].name || towers[minIdx].externalId} a ${towers[maxIdx].name || towers[maxIdx].externalId}`,
        metrics: { towers: range.length, km: "0.00" },
      };
    }

    const idx =
      startIdx !== -1
        ? startIdx
        : towers.findIndex(
            (t: {
              id: string;
              externalId?: string | null;
              name?: string | null;
            }) => t.id === start || t.externalId === start || t.name === start,
          );
    const tower = towers[idx];
    return {
      expandedTowers: tower ? [tower.externalId || tower.name || tower.id] : [],
      finalLabel: String(tower?.name || tower?.externalId || start),
      metrics: { towers: tower ? 1 : 0, km: "0.00" },
    };
  }

  private sliceRange<
    T extends { id: string; externalId?: string | null; name?: string | null },
  >(elements: T[], start: string, multi: boolean, end?: string): T[] {
    const findIdx = (val: string): number => {
      if (!val) return -1;
      const l = val.trim().toLowerCase();
      return elements.findIndex(
        (e) =>
          String(e.id).toLowerCase() === l ||
          String(e.externalId || "").toLowerCase() === l ||
          String(e.name || "").toLowerCase() === l,
      );
    };

    if (multi && end) {
      const s = findIdx(start);
      const e = findIdx(end);
      if (s !== -1 && e !== -1)
        return elements.slice(Math.min(s, e), Math.max(s, e) + 1);
    }
    const idx = findIdx(start);
    return idx !== -1 ? [elements[idx]] : [];
  }

  private findTowerIdx(
    towers: {
      id: string;
      externalId?: string | null;
      name?: string | null;
      metadata?: unknown;
    }[],
    val: string,
  ): number {
    if (!val) return -1;
    const l = val.trim().toLowerCase();
    return towers.findIndex((t) => {
      const objId = String(
        (t.metadata as Record<string, unknown>)?.objectId || "",
      ).toLowerCase();
      return (
        String(t.id).toLowerCase() === l ||
        String(t.externalId || "").toLowerCase() === l ||
        String(t.name || "").toLowerCase() === l ||
        objId === l
      );
    });
  }
}
