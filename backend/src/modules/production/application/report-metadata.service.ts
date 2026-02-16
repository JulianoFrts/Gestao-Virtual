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

            if (isMultiSelection && subPointEnd) {
                const startIdx = spans.findIndex((s: any) => s.id === subPoint);
                const endIdx = spans.findIndex((s: any) => s.id === subPointEnd);

                if (startIdx !== -1 && endIdx !== -1) {
                    const min = Math.min(startIdx, endIdx);
                    const max = Math.max(startIdx, endIdx);
                    selectedSpans = spans.slice(min, max + 1);
                }
            } else if (subPoint) {
                const singleSpan = spans.find((s: any) => s.id === subPoint);
                if (singleSpan) selectedSpans = [singleSpan];
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

            if (isMultiSelection && subPointEnd) {
                const startIdx = towers.findIndex((t: any) => t.id === subPoint || t.externalId === subPoint || t.name === subPoint);
                const endIdx = towers.findIndex((t: any) => t.id === subPointEnd || t.externalId === subPointEnd || t.name === subPointEnd);

                if (startIdx !== -1 && endIdx !== -1) {
                    const min = Math.min(startIdx, endIdx);
                    const max = Math.max(startIdx, endIdx);
                    const range = towers.slice(min, max + 1);
                    expandedTowers = range.map((t: any) => t.id); // Internal IDs for metadata
                    finalLabel = `${towers[min].name || towers[min].externalId} a ${towers[max].name || towers[max].externalId}`;
                    metrics = {
                        towers: range.length,
                        km: "0.00"
                    };
                }
            } else {
                const tower = towers.find((t: any) => t.id === subPoint || t.externalId === subPoint || t.name === subPoint);
                if (tower) {
                    expandedTowers = [tower.id];
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
