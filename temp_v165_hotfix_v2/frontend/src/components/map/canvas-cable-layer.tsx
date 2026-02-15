import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/mapbox';
import { CatenaryCalculator, Point3D } from '@/services/catenary-calculator';

interface CanvasCableLayerProps {
    projectSpans: any[];
    visibleTowers: any[];
    cableColor?: string;
    hiddenPlacemarkIds?: Set<string>;
    projectId?: string;
}

const normalizeName = (name: string) => (name || '').trim().toUpperCase();

export function CanvasCableLayer({
    projectSpans,
    visibleTowers,
    cableColor = '#0ea5e9',
    hiddenPlacemarkIds = new Set(),
    projectId
}: CanvasCableLayerProps) {
    const { current: map } = useMap();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 1. Pre-calculate Cable Segments (Geometry + Color) only when data changes
    const cableSegments = React.useMemo(() => {
        if (!projectSpans.length) return [];

        console.log(`🔌 [CanvasCableLayer] Processing ${projectSpans.length} spans. Towers available: ${visibleTowers.length}`);

        // Create Lookup Map
        const towerMap = new Map();
        const allTowerNames: string[] = [];

        if (visibleTowers.length > 0) {
            visibleTowers.forEach(t => {
                const nName = normalizeName(t.name);
                if (nName) {
                    towerMap.set(nName, t);
                    allTowerNames.push(nName);
                }
                if (t.id) towerMap.set(t.id.toString(), t);
            });
        }

        const segments: any[] = [];
        let matchCount = 0;
        let directGeoCount = 0;

        projectSpans.forEach(span => {
            const startIdOriginal = span.tower_start_id?.toString() || '';
            const endIdOriginal = span.tower_end_id?.toString() || '';
            const searchStart = normalizeName(startIdOriginal);
            const searchEnd = normalizeName(endIdOriginal);

            let t1 = towerMap.get(searchStart);
            let t2 = towerMap.get(searchEnd);

            // ... fallback logic similar to before but cleaner
            if (!t1 || !t2) {
                // Simplified fallback for search
                t1 = t1 || allTowerNames.find(name => name.includes(searchStart) || searchStart.includes(name)) ? towerMap.get(allTowerNames.find(name => name.includes(searchStart) || searchStart.includes(name))) : null;
                t2 = t2 || allTowerNames.find(name => name.includes(searchEnd) || searchEnd.includes(name)) ? towerMap.get(allTowerNames.find(name => name.includes(searchEnd) || searchEnd.includes(name))) : null;
            }

            // CHECK HIDING
            const tProjId = span.project_id || projectId;
            const hKeyAB = `${tProjId}:::${searchStart}:::${searchEnd}`;
            const hKeyBA = `${tProjId}:::${searchEnd}:::${searchStart}`;

            if (hiddenPlacemarkIds.has(hKeyAB) || hiddenPlacemarkIds.has(hKeyBA)) {
                return;
            }

            // Priority 1: Use direct Geometry from DB (imported from KML)
            if (span.geometry && span.geometry.type === 'LineString') {
                const points3D = span.geometry.coordinates.map((c: any) => ({
                    x: c[0],
                    y: c[1],
                    z: c[2] || 0
                }));

                segments.push({
                    id: span.id,
                    color: span.cable_color || cableColor,
                    points3D
                });
                directGeoCount++;
                return;
            }

            // Priority 2: Recalculate Catenary (requires towers)
            if (!t1 || !t2) return;
            matchCount++;

            const phases = Number(span.cable_phases) || 1;
            const spacing = Number(span.cable_spacing) || 0.5;
            const constantC = Number(span.catenary_constant) || 1200;

            const hStart = span.height_start ? Number(span.height_start) : (t1.towerHeight || 30);
            const hEnd = span.height_end ? Number(span.height_end) : (t2.towerHeight || 30);
            const z1 = Number(t1.elevation ?? t1.coordinates.alt ?? 0);
            const z2 = Number(t2.elevation ?? t2.coordinates.alt ?? 0);

            const p1Base = { x: t1.coordinates.lng, y: t1.coordinates.lat, z: z1 + hStart };
            const p2Base = { x: t2.coordinates.lng, y: t2.coordinates.lat, z: z2 + hEnd };

            const dx = p2Base.x - p1Base.x;
            const dy = p2Base.y - p1Base.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = len > 0 ? -dy / len : 0;
            const ny = len > 0 ? dx / len : 0;

            for (let i = 0; i < phases; i++) {
                const offsetMultiplier = i - (phases - 1) / 2;
                const offsetLng = nx * 0.00001 * spacing * offsetMultiplier;
                const offsetLat = ny * 0.00001 * spacing * offsetMultiplier;

                const oP1 = { ...p1Base, x: p1Base.x + offsetLng, y: p1Base.y + offsetLat };
                const oP2 = { ...p2Base, x: p2Base.x + offsetLng, y: p2Base.y + offsetLat };
                const points3D = CatenaryCalculator.generateCatenaryPoints(oP1, oP2, constantC, 25);

                segments.push({
                    id: `${span.id}-p${i}`,
                    color: span.cable_color || cableColor,
                    points3D
                });
            }
        });

        console.log(`✅ [CanvasCableLayer] Generated ${segments.length} segments (Direct: ${directGeoCount}, Match: ${matchCount}).`);
        return segments;
    }, [projectSpans, visibleTowers, cableColor, hiddenPlacemarkIds, projectId]);

    // 2. Render Loop (Fast)
    useEffect(() => {
        if (!map || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
            const nativeMap = (map as any).getMap?.() || map;
            if (!nativeMap || !nativeMap.project) return;

            const container = nativeMap.getCanvasContainer();
            if (!container) return;

            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== container.offsetWidth * dpr || canvas.height !== container.offsetHeight * dpr) {
                canvas.width = container.offsetWidth * dpr;
                canvas.height = container.offsetHeight * dpr;
                ctx.scale(dpr, dpr);
            }

            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            if (!cableSegments.length) return;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            let debugOnce = false;

            cableSegments.forEach(seg => {
                if (hiddenPlacemarkIds.has(seg.compositeId)) return;

                ctx.beginPath();
                let isFirst = true;
                let isValid = false;

                for (const p of seg.points3D) {
                    const pos = nativeMap.project([p.x, p.y, p.z]);
                    if (pos) {
                        if (isFirst) {
                            ctx.moveTo(pos.x, pos.y);
                            isFirst = false;
                        } else {
                            ctx.lineTo(pos.x, pos.y);
                        }
                        isValid = true;

                        if (!debugOnce && pos.x > 0 && pos.x < canvas.width / dpr && pos.y > 0 && pos.y < canvas.height / dpr) {
                            console.log(`✏️ [CanvasCableLayer] Drawing segment ${seg.id} at:`, pos);
                            debugOnce = true;
                        }
                    }
                }

                if (isValid) {
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = seg.color || cableColor;
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = seg.color || cableColor;
                    ctx.stroke();
                }
            });

            nativeMap.triggerRepaint();
        };

        map.on('render', render);
        map.on('move', render);
        map.on('moveend', render);
        render();

        return () => {
            map.off('render', render);
            map.off('move', render);
            map.off('moveend', render);
        };
    }, [map, cableSegments, hiddenPlacemarkIds]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                width: '100%',
                height: '100%',
                zIndex: 9999
            }}
        />
    );
}
