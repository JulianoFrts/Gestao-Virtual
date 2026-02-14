import React, { useMemo } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/mapbox';

import { CatenaryCalculator } from '@/services/catenary-calculator';

interface MapboxCableInteractionProps {
    projectSpans: any[];
    visibleTowers: any[];
    onSelectSpan?: (span: any) => void;
    hiddenPlacemarkIds?: Set<string>;
    projectId?: string;
}

const normalizeName = (name: string) => (name || '').trim().toUpperCase();

export function MapboxCableInteraction({
    projectSpans,
    visibleTowers,
    onSelectSpan,
    hiddenPlacemarkIds = new Set(),
    projectId
}: MapboxCableInteractionProps) {
    const { current: map } = useMap();

    const geojsonData = useMemo(() => {
        const features: any[] = [];
        const towerMap = new Map();
        const towersByDoc = new Map<string, any[]>();
        const connectedPairs = new Set<string>();

        // Pre-process towers with terrain if map is available
        const resolvedTowers = visibleTowers.map(t => {
            let el = t.elevation;
            if ((!el || el === 0) && map) {
                const terrainEl = map.queryTerrainElevation([t.coordinates.lng, t.coordinates.lat]);
                if (terrainEl !== null) el = terrainEl;
            }
            return { ...t, elevation: el };
        });

        resolvedTowers.forEach(t => {
            const nName = normalizeName(t.name);
            if (nName) towerMap.set(nName, t);
            if (t.id) towerMap.set(t.id.toString(), t);

            const docId = (t as any).document_id || (t as any).projectId || 'unknown';
            if (!towersByDoc.has(docId)) towersByDoc.set(docId, []);
            towersByDoc.get(docId)!.push(t);
        });

        // 1. Manual Spans
        projectSpans.forEach(span => {
            const sName = normalizeName(span.tower_start_id);
            const eName = normalizeName(span.tower_end_id);
            const t1 = towerMap.get(sName);
            const t2 = towerMap.get(eName);

            // CHECK HIDING
            const tProjId = span.project_id || projectId;
            const hKeyAB = `${tProjId}:::${sName}:::${eName}`;
            const hKeyBA = `${tProjId}:::${eName}:::${sName}`;

            if (hiddenPlacemarkIds.has(hKeyAB) || hiddenPlacemarkIds.has(hKeyBA)) {
                return;
            }

            if (t1 && t2) {
                connectedPairs.add([sName, eName].sort().join(':::'));
                const hStart = span.height_start || t1.towerHeight || 30;
                const hEnd = span.height_end || t2.towerHeight || 30;

                const p1 = { x: t1.coordinates.lng, y: t1.coordinates.lat, z: 1000 + hStart };
                const p2 = { x: t2.coordinates.lng, y: t2.coordinates.lat, z: 1000 + hEnd };

                const points = CatenaryCalculator.generateCatenaryPoints(p1, p2, span.catenary_constant || 1200, 10);
                const coords = points.map(p => [p.x, p.y, p.z]);

                features.push({
                    type: 'Feature',
                    id: span.id,
                    properties: { ...span, source: 'cable_interaction', isAuto: false },
                    geometry: { type: 'LineString', coordinates: coords }
                });
            }
        });

        // 2. Auto-detected Spans (Sync with Mapbox3DLayer)
        const MAX_AUTO_SPAN_DISTANCE = 1000;
        const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371e3;
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        towersByDoc.forEach((placemarks, dId) => {
            const sorted = [...placemarks].sort((a, b) => {
                const n1 = parseInt((a.name || '').replace(/\D/g, ''));
                const n2 = parseInt((b.name || '').replace(/\D/g, ''));
                if (!isNaN(n1) && !isNaN(n2)) return n1 - n2;
                return (a.name || '').localeCompare(b.name || '');
            });

            for (let i = 0; i < sorted.length - 1; i++) {
                const t1 = sorted[i];
                const t2 = sorted[i + 1];
                const sName = normalizeName(t1.name);
                const eName = normalizeName(t2.name);
                const pairKey = [sName, eName].sort().join(':::');

                if (connectedPairs.has(pairKey)) continue;

                // CHECK HIDING
                const tProjId = (t1 as any).projectId || (t1 as any).document_id || projectId;
                const hKeyAB = `${tProjId}:::${sName}:::${eName}`;
                const hKeyBA = `${tProjId}:::${eName}:::${sName}`;

                if (hiddenPlacemarkIds.has(hKeyAB) || hiddenPlacemarkIds.has(hKeyBA)) {
                    continue;
                }

                const d = getDist(t1.coordinates.lat, t1.coordinates.lng, t2.coordinates.lat, t2.coordinates.lng);
                if (d > MAX_AUTO_SPAN_DISTANCE) continue;

                connectedPairs.add(pairKey);

                const p1 = { x: t1.coordinates.lng, y: t1.coordinates.lat, z: 1000 + (t1.towerHeight || 30) };
                const p2 = { x: t2.coordinates.lng, y: t2.coordinates.lat, z: 1000 + (t2.towerHeight || 30) };

                const points = CatenaryCalculator.generateCatenaryPoints(p1, p2, 1200, 10);
                const coords = points.map(p => [p.x, p.y, p.z]);

                features.push({
                    type: 'Feature',
                    id: `auto-${dId}-${i}`,
                    properties: {
                        id: `auto-${dId}-${i}`,
                        name: `Cabo Automático ${t1.name}-${t2.name}`,
                        source: 'cable_interaction',
                        isAuto: true,
                        document_id: dId
                    },
                    geometry: { type: 'LineString', coordinates: coords }
                });
            }
        });

        return { type: 'FeatureCollection' as const, features };
    }, [projectSpans, visibleTowers, map, hiddenPlacemarkIds, projectId]);


    return (
        <Source id="cable-interaction-source" type="geojson" data={geojsonData}>
            <Layer
                id="cable-interaction-layer"
                type="line"
                layout={{
                    'line-elevation-reference': 'sea'
                }}
                paint={{
                    'line-width': 15,
                    'line-opacity': 0 // Invisible but clickable
                }}
            />
            {/* Debug Layer (Uncomment to see interaction areas) */}
            {/* <Layer
                id="cable-debug-layer"
                type="line"
                paint={{
                    'line-width': 2,
                    'line-color': '#ff0000',
                    'line-opacity': 0.2
                }}
            /> */}
        </Source>
    );
}
