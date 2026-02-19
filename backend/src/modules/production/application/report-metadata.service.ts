import { prisma } from "@/lib/prisma/client";

export interface PreviewIntervalParams {
    projectId: string;
    subPointType: 'TORRE' | 'VAO' | 'TRECHO' | 'GERAL' | 'ESTRUTURA';
    subPoint: string;
    subPointEnd?: string;
    isMultiSelection: boolean;
    stageId?: string;
    companyId?: string;
}

export class ReportMetadataService {
    async previewInterval(params: PreviewIntervalParams) {
        const { projectId, subPointType, subPoint, subPointEnd, isMultiSelection, stageId } = params;

        let result: { expandedTowers: string[], finalLabel: string, metrics: { towers: number, km: string } };

        if (subPointType === 'VAO' || subPointType === 'TRECHO') {
            result = await this.handleSpanInterval(projectId, subPoint, isMultiSelection, subPointEnd);
        } else if (subPointType === 'TORRE' || subPointType === 'ESTRUTURA') {
            result = await this.handleTowerInterval(projectId, subPoint, isMultiSelection, subPointEnd);
        } else {
            result = { expandedTowers: [], finalLabel: subPoint, metrics: { towers: 0, km: "0.00" } };
        }

        // Se tivermos um stageId, vamos enriquecer com o progresso atual
        if (stageId && result.expandedTowers.length > 0) {
            const enrichedDetails = await this.getDetailedProgress(projectId, stageId, result.expandedTowers);
            return {
                ...result,
                details: enrichedDetails
            };
        }

        return result;
    }

    // Método para buscar progresso real
    private async getDetailedProgress(projectId: string, stageId: string, towerIds: string[]) {
        const elements = await prisma.mapElementTechnicalData.findMany({
            where: {
                projectId,
                OR: [
                    { id: { in: towerIds } },
                    { externalId: { in: towerIds } },
                    { name: { in: towerIds } }
                ]
            },
            include: {
                mapElementProductionProgress: {
                    where: { activityId: stageId }
                }
            }
        });

        return towerIds.map(id => {
            const element = elements.find((e: any) => e.id === id || e.externalId === id || e.name === id);
            const progress = element?.mapElementProductionProgress?.[0];
            
            return {
                id,
                progress: progress?.progressPercent || 0,
                status: (progress?.status as 'IN_PROGRESS' | 'FINISHED' | 'BLOCKED') || 'IN_PROGRESS'
            };
        });
    }

    private async handleSpanInterval(projectId: string, start: string, multi: boolean, end?: string) {
        const spans = await prisma.mapElementTechnicalData.findMany({
            where: { projectId, elementType: 'SPAN' },
            orderBy: { sequence: 'asc' }
        });

        const selected = this.sliceRange(spans, start, multi, end);
        if (selected.length === 0) return { expandedTowers: [], finalLabel: start, metrics: { towers: 0, km: "0.00" } };

        const uniqueTowers = new Set<string>();
        let totalMeters = 0;

        selected.forEach((s: any) => {
            const meta = s.metadata as any;
            if (meta?.towerStartId) uniqueTowers.add(meta.towerStartId);
            if (meta?.towerEndId) uniqueTowers.add(meta.towerEndId);
            totalMeters += Number(meta?.spanLength || 0);
        });

        return {
            expandedTowers: Array.from(uniqueTowers),
            finalLabel: multi && end ? `${selected[0].name || selected[0].externalId} a ${selected[selected.length - 1].name || selected[selected.length - 1].externalId}` : (selected[0].name || selected[0].externalId),
            metrics: { towers: uniqueTowers.size, km: (totalMeters / 1000).toFixed(2) }
        };
    }

    private async handleTowerInterval(projectId: string, start: string, multi: boolean, end?: string) {
        const towers = await prisma.mapElementTechnicalData.findMany({
            where: { projectId, elementType: 'TOWER' },
            orderBy: { sequence: 'asc' }
        });

        const startIdx = this.findTowerIdx(towers, start);
        const endIdx = multi && end ? this.findTowerIdx(towers, end) : -1;

        if (multi && startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            const range = towers.slice(min, max + 1);
            return {
                expandedTowers: range.map((t: any) => t.externalId || t.name || t.id),
                finalLabel: `${towers[min].name || towers[min].externalId} a ${towers[max].name || towers[max].externalId}`,
                metrics: { towers: range.length, km: "0.00" }
            };
        }

        const idx = startIdx !== -1 ? startIdx : towers.findIndex((t: any) => t.id === start || t.externalId === start || t.name === start);
        const tower = towers[idx];
        return {
            expandedTowers: tower ? [tower.externalId || tower.name || tower.id] : [],
            finalLabel: tower?.name || tower?.externalId || start,
            metrics: { towers: tower ? 1 : 0, km: "0.00" }
        };
    }

    private sliceRange(elements: any[], start: string, multi: boolean, end?: string) {
        const findIdx = (val: string) => {
            if (!val) return -1;
            const l = val.trim().toLowerCase();
            return elements.findIndex((e: any) => String(e.id).toLowerCase() === l || String(e.externalId || '').toLowerCase() === l || String(e.name || '').toLowerCase() === l);
        };

        if (multi && end) {
            const s = findIdx(start);
            const e = findIdx(end);
            if (s !== -1 && e !== -1) return elements.slice(Math.min(s, e), Math.max(s, e) + 1);
        }
        const idx = findIdx(start);
        return idx !== -1 ? [elements[idx]] : [];
    }

    private findTowerIdx(towers: any[], val: string) {
        if (!val) return -1;
        const l = val.trim().toLowerCase();
        return towers.findIndex((t: any) => {
            const objId = String((t.metadata as any)?.objectId || '').toLowerCase();
            return String(t.id).toLowerCase() === l || String(t.externalId || '').toLowerCase() === l || String(t.name || '').toLowerCase() === l || objId === l;
        });
    }
}
