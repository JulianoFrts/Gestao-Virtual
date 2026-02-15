import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { TowerPhysics } from './tower-physics';
import { CableSettings } from '../components/map/cable-config-modal';

export interface TowerScenegraphOptions {
    towerVerticalOffset: number;
    terrainRevision?: number;
    getTerrainElevation?: (lng: number, lat: number) => number;
    cableSettings?: CableSettings | null;
    localModelUrl?: string;
    projectAnchors?: Record<string, any[]>;
    templateAnchors?: Record<string, any[]>;
}

const DEFAULT_MODEL_URL = '/standard-tower.glb';

export const TowerScenegraphService = {
    getLayers: (towers: any[], options: TowerScenegraphOptions, alignments?: Map<string, number>): any[] => {
        if (!options || towers.length === 0) return [];

        const visibleTowers = towers.filter(t => !t.isHidden && !t.is_hidden);

        // Debug layer to visualize tower positions at ground level
        const debugLayer = new ScatterplotLayer({
            id: 'tower-base-indicator',
            data: visibleTowers,
            getPosition: (d: any) => {
                const globalOffset = options.cableSettings?.towerVerticalOffset || 0;
                return [d.coordinates.lng, d.coordinates.lat, (d.elevation || 0) + globalOffset];
            },
            getRadius: 2,
            radiusUnits: 'meters',
            getFillColor: [255, 0, 0, 180], // Red semi-transparent
            pickable: true,
            updateTriggers: {
                getPosition: [visibleTowers.length, options.terrainRevision]
            }
        });

        const settings = options.cableSettings;
        const modelUrl = settings?.customModelUrl || options.localModelUrl || DEFAULT_MODEL_URL;

        const towerBasePolygons: any[] = [];

        const towerLayer = new ScenegraphLayer({
            id: 'tower-scenegraph-layer',
            data: visibleTowers,
            scenegraph: modelUrl,
            getPosition: (d: any) => {
                const globalOffset = options.cableSettings?.towerVerticalOffset || 0;
                return [d.coordinates.lng, d.coordinates.lat, (d.elevation || 0) + globalOffset];
            },
            getOrientation: ((d: any, { index, data }: any): [number, number, number] => {
                const manualBearing = alignments?.get(d.id);
                const bearing = manualBearing !== undefined ? manualBearing : TowerPhysics.calculateTowerBearing(index, data, options.cableSettings?.alignmentMethod);
                const manualRot = (d as any).rotation || 0;
                const deflection = (d as any).deflection || 0;
                const yaw = (360 - bearing - deflection - manualRot + 90) % 360;
                return [0, yaw, 90];
            }) as any,
            getScale: ((d: any): [number, number, number] => {
                const targetH = d.towerHeight || 30;
                const intrinsicH = 1.0;
                const scale = targetH / intrinsicH;
                return [scale, scale, scale];
            }) as any,
            getTranslation: ((d: any): [number, number, number] => {
                // Z-Sync 2.0: Detect Base Anchors for automatic grounding
                // Concatenate project and template anchors to ensure we see everything
                const projectList = options.projectAnchors?.[d.id] || [];
                const templateList = options.templateAnchors?.[d.towerId] || [];
                const allAnchors = [...projectList, ...templateList];

                const towerAnchors = allAnchors.filter((a: any) => {
                    const name = (a.name || '').toUpperCase();
                    return name.includes('BASE') || name.includes('FIXAÇÃO') || name.includes('FIXACAO') || name.includes('PE') || name.includes('PÉ');
                });

                if (towerAnchors.length > 0) {
                    // Apply Scaling: Anchors are usually normalized/unit vectors in the GLB space.
                    // We must scale them by the tower height to get meters.
                    const scale = d.towerHeight || 30; // Matches getScale logic

                    // Calculate centroid of the base anchors (SCALED)
                    const avgX = towerAnchors.reduce((acc, a) => acc + ((a.position.x ?? a.position[0] ?? 0) * scale), 0) / towerAnchors.length;
                    const avgY = towerAnchors.reduce((acc, a) => acc + ((a.position.y ?? a.position[1] ?? 0) * scale), 0) / towerAnchors.length;
                    const avgZ = towerAnchors.reduce((acc, a) => acc + ((a.position.z ?? a.position[2] ?? 0) * scale), 0) / towerAnchors.length;

                    // Add to debug polygons
                    if (towerAnchors.length >= 3) {
                        const bearing = alignments?.get(d.id) || 0;
                        const pos = { lng: d.coordinates.lng, lat: d.coordinates.lat };
                        const globalOffset = options.cableSettings?.towerVerticalOffset || 0;
                        const groundedOffset = -avgZ;

                        const coords = towerAnchors.map((a: any) => {
                            // Scale individual points for polygon
                            const ax = (a.position.x ?? 0) * scale;
                            const ay = (a.position.y ?? 0) * scale;
                            const az = (a.position.z ?? 0) * scale;

                            const p = TowerPhysics.calculateAnchorPosition(
                                pos, bearing, ax, 0, 0, (d.towerHeight || 30),
                                groundedOffset,
                                (d.elevation || 0), 0,
                                ay, 0, 0
                            );
                            return [p.lng, p.lat, p.alt + az];
                        });
                        // Close polygon
                        coords.push(coords[0]);
                        towerBasePolygons.push({
                            type: 'Feature',
                            geometry: { type: 'Polygon', coordinates: [coords] }
                        });
                    }

                    // Snap the centroid of the base anchors to the map pin (d.coordinates + d.elevation)
                    // We remove the local average offset (avgX, avgY, avgZ) and the global lift.
                    const globalOffset = options.cableSettings?.towerVerticalOffset || 0;
                    return [-avgX, -avgY, -avgZ - globalOffset];
                }

                return [0, 0, 0];
            }) as any,
            pickable: true,
            sizeScale: 1,
            updateTriggers: {
                getPosition: [visibleTowers.length, options.towerVerticalOffset, options.terrainRevision, modelUrl],
                getOrientation: [visibleTowers.length, modelUrl],
                getScale: [visibleTowers.length, modelUrl],
                getTranslation: [visibleTowers.length, options.projectAnchors, options.templateAnchors]
            }
        });

        const basePolygonLayer = new GeoJsonLayer({
            id: 'tower-base-polygon-layer',
            data: { type: 'FeatureCollection', features: towerBasePolygons },
            getFillColor: [255, 0, 0, 150],
            getLineColor: [255, 0, 0, 255],
            getLineWidth: 2,
            lineWidthUnits: 'pixels',
            stroked: true,
            filled: true,
            updateTriggers: {
                data: [towerBasePolygons.length, options.terrainRevision]
            }
        });

        const layers: any[] = [debugLayer, basePolygonLayer];

        // Only add ScenegraphLayer if the model is NOT procedural
        if (!modelUrl.startsWith('procedural-')) {
            layers.unshift(towerLayer);
        }

        return layers;
    }
};
