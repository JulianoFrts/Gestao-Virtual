import { ScatterplotLayer } from '@deck.gl/layers';
import { TowerPhysics } from './tower-physics';
import { TowerAnchorService } from './tower-anchor-service';
import { CableSettings, ModelTransform } from '../components/map/cable-config-modal';

export interface AnchorDebugOptions {
    towers: any[];
    cableSettings: CableSettings;
    placemarkOverrides: Record<string, any>;
    projectAnchors: Record<string, any[]>;
    templateAnchors: Record<string, any[]>;
    localModelUrl: string;
    getEffectiveTransform: (individual: ModelTransform | undefined, url: string) => ModelTransform | undefined;
    terrainRevision?: number;
    getTerrainElevation?: (lng: number, lat: number) => number;
    onAnchorClick?: (towerId: string, anchorConfigId: string) => void;
}

export const AnchorDebugService = {
    getLayers: (options: AnchorDebugOptions): any[] => {
        const {
            towers,
            cableSettings,
            placemarkOverrides,
            projectAnchors,
            templateAnchors,
            localModelUrl,
            getEffectiveTransform,
            terrainRevision,
            getTerrainElevation,
            onAnchorClick
        } = options;

        const enabledAnchors = cableSettings.anchors.filter(a => a.enabled);
        const points: any[] = [];

        towers.forEach((t) => {
            if (t.isHidden) return;

            enabledAnchors.forEach((config) => {
                const anchor = TowerAnchorService.getAnchor({
                    tower: t,
                    config,
                    role: 'vante',
                    placemarkOverrides,
                    cableSettings,
                    projectAnchors,
                    templateAnchors,
                    localModelUrl,
                    getEffectiveTransform,
                    getTerrainElevation
                });

                points.push({
                    position: [anchor.x, anchor.y, anchor.z],
                    color: hexToRgb(config.color),
                    id: `debug-${t.id}-${config.id}`,
                    towerId: t.id,
                    anchorId: config.id,
                    towerName: t.name
                });
            });
        });

        return [
            new ScatterplotLayer({
                id: 'anchor-debug-layer',
                data: points,
                getPosition: (d: any) => d.position,
                getFillColor: (d: any) => [d.color[0], d.color[1], d.color[2], 255] as [number, number, number, number],
                getRadius: 0.6,
                radiusUnits: 'meters',
                stroked: true,
                getLineColor: [255, 255, 255, 255],
                getLineWidth: 0.1,
                lineWidthUnits: 'meters',
                pickable: true,
                updateTriggers: {
                    getPosition: [points.length, terrainRevision]
                },
                onClick: (info: any) => {
                    if (info.object && onAnchorClick) {
                        onAnchorClick(info.object.towerId, info.object.anchorId);
                    }
                    return true;
                }
            })
        ];
    }
};

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [255, 0, 0];
}
