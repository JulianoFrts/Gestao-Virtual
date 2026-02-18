import { prisma } from "@/lib/prisma/client";

export interface PreviewIntervalParams {
    projectId: string;
    subPointType: 'TORRE' | 'VAO' | 'TRECHO' | 'GERAL';
    subPoint: string;
    subPointEnd?: string;
    isMultiSelection: boolean;
}

export class ReportMetadataService {
    async previewInterval(params: PreviewIntervalParams) {
        const { projectId, subPointType, subPoint, subPointEnd, isMultiSelection } = params;

        let expandedTowers: string[] = [];
        let finalLabel = subPoint;
        let metrics = { towers: 0, km: "0.00" };

        if (subPointType === 'VAO' || subPointType === 'TRECHO') {
            const spans = await prisma.mapElementTechnicalData.findMany({
                where: { projectId, elementType: 'SPAN' },
                orderBy: { sequence: 'asc' }
            });

            let selectedSpans: any[] = [];

            const findSpanIdx = (val: string) => {
                if (!val) return -1;
                const lowerVal = val.trim().toLowerCase();
                return spans.findIndex((s: any) => {
                    const id = String(s.id).toLowerCase();
                    const extId = String(s.externalId || '').toLowerCase();
                    const name = String(s.name || '').toLowerCase();
                    return id === lowerVal || extId === lowerVal || name === lowerVal;
                });
            };

            if (isMultiSelection && subPointEnd) {
                const startIdx = findSpanIdx(subPoint);
                const endIdx = findSpanIdx(subPointEnd);

                if (startIdx !== -1 && endIdx !== -1) {
                    const min = Math.min(startIdx, endIdx);
                    const max = Math.max(startIdx, endIdx);
                    selectedSpans = spans.slice(min, max + 1);
                }
            } else if (subPoint) {
                const idx = findSpanIdx(subPoint);
                if (idx !== -1) selectedSpans = [spans[idx]];
            }

            if (selectedSpans.length > 0) {
                const uniqueTowers = new Set<string>();
                let totalMeters = 0;

                selectedSpans.forEach((s: any) => {
                    const meta = s.metadata as any;
                    if (meta?.towerStartId) uniqueTowers.add(meta.towerStartId);
                    if (meta?.towerEndId) uniqueTowers.add(meta.towerEndId);
                    totalMeters += Number(meta?.spanLength || 0);
                });

                expandedTowers = Array.from(uniqueTowers);
                metrics = {
                    towers: uniqueTowers.size,
                    km: (totalMeters / 1000).toFixed(2)
                };

                finalLabel = isMultiSelection && subPointEnd
                    ? `${selectedSpans[0].name || selectedSpans[0].externalId} a ${selectedSpans[selectedSpans.length - 1].name || selectedSpans[selectedSpans.length - 1].externalId}`
                    : (selectedSpans[0].name || selectedSpans[0].externalId);
            }
        } else if (subPointType === 'TORRE') {
            const towers = await prisma.mapElementTechnicalData.findMany({
                where: { projectId, elementType: 'TOWER' },
                orderBy: { sequence: 'asc' }
            });

            const findTowerIdx = (val: string) => {
                if (!val) return -1;
                const lowerVal = val.trim().toLowerCase();
                return towers.findIndex((t: any) => {
                    const id = String(t.id).toLowerCase();
                    const extId = String(t.externalId || '').toLowerCase();
                    const name = String(t.name || '').toLowerCase();
                    const objectId = String((t.metadata as any)?.objectId || '').toLowerCase();

                    return id === lowerVal || extId === lowerVal || name === lowerVal || objectId === lowerVal;
                });
            };

            if (isMultiSelection && subPointEnd) {
                const startIdx = findTowerIdx(subPoint);
                const endIdx = findTowerIdx(subPointEnd);

                if (startIdx !== -1 && endIdx !== -1) {
                    const min = Math.min(startIdx, endIdx);
                    const max = Math.max(startIdx, endIdx);
                    const range = towers.slice(min, max + 1);
                    
                    // Retornar o identificador que o frontend usa para lookup (externalId || name || id)
                    expandedTowers = range.map((t: any) => t.externalId || t.name || t.id);
                    
                    finalLabel = `${towers[min].name || towers[min].externalId} a ${towers[max].name || towers[max].externalId}`;
                    metrics = {
                        towers: range.length,
                        km: "0.00"
                    };
                } else {
                    // Fallback para ponto único se não encontrar o intervalo
                    const tower = towers[startIdx] !== undefined ? towers[startIdx] : towers.find((t: any) => t.id === subPoint || t.externalId === subPoint || t.name === subPoint);
                    if (tower) {
                        expandedTowers = [tower.externalId || tower.name || tower.id];
                        finalLabel = tower.name || tower.externalId || '';
                        metrics = { towers: 1, km: "0.00" };
                    }
                }
            } else {
                const towerIdx = findTowerIdx(subPoint);
                const tower = towerIdx !== -1 ? towers[towerIdx] : null;
                if (tower) {
                    expandedTowers = [tower.externalId || tower.name || tower.id];
                    finalLabel = tower.name || tower.externalId || '';
                    metrics = { towers: 1, km: "0.00" };
                }
            }
        }

        return {
            expandedTowers,
            finalLabel,
            metrics
        };
    }
}
