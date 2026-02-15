import { ModelTransform } from '../components/map/cable-config-modal';

export interface Tower3DFeature {
    type: 'Feature';
    properties: {
        id: string;
        name: string;
        model: string;
        elevation: number;
        heading: number;
        towerHeight: number;
        color: string;
        scaleX: number;
        scaleY: number;
        scaleZ: number;
        rotX: number;
        rotY: number;
        rotZ: number;
        offX: number;
        offY: number;
        offZ: number;
        elevationOffset: number;
    };
    geometry: {
        type: 'Point';
        coordinates: [number, number, number];
    };
}

export interface TowerLayerOptions {
    towersWithTerrain: any[];
    placemarkOverrides: Record<string, any>;
    towerAlignments: Map<string, number>;
    cableSettings: any;
    localModelUrl: string;
    getModelId: (url: string) => string;
    getEffectiveTransform: (individual: ModelTransform | undefined, url: string) => ModelTransform | undefined;
    getModelConfig: (url: string) => ModelTransform | undefined;
}

export const TowerLayerService = {
    generateTowerGeoJSON: (options: TowerLayerOptions): { type: 'FeatureCollection', features: Tower3DFeature[] } => {
        const {
            towersWithTerrain,
            placemarkOverrides,
            towerAlignments,
            cableSettings,
            localModelUrl,
            getModelId,
            getEffectiveTransform,
            getModelConfig
        } = options;

        const features = towersWithTerrain.filter(p => p.isLocal).map(p => {
            const docId = (p as any).document_id || '';
            const compositeId = `${docId}:::${p.id}`;
            const override = placemarkOverrides[compositeId];
            const towerHeight = override?.height ?? p.towerHeight ?? 30;

            const defaultModelForPattern = localModelUrl;
            const effectiveModelUrl = override?.customModelUrl || cableSettings?.customModelUrl || defaultModelForPattern;
            const effectiveModelId = getModelId(effectiveModelUrl);

            const individualTransform = override?.customModelTransform;
            const modelCfg = getEffectiveTransform(individualTransform, effectiveModelUrl) || getModelConfig(effectiveModelUrl);

            return {
                type: 'Feature',
                properties: {
                    id: p.id,
                    name: p.name,
                    model: effectiveModelId,
                    elevation: p.elevation,
                    heading: override?.angle !== undefined
                        ? override.angle
                        : (towerAlignments.get(p.id) ?? p.calculatedHeading ?? 0),
                    towerHeight: towerHeight,
                    color: override?.color || '',
                    scaleX: (modelCfg?.scale[0] ?? 1) * (modelCfg?.baseHeight ?? 1),
                    scaleY: (modelCfg?.scale[1] ?? 1) * (modelCfg?.baseHeight ?? 1),
                    scaleZ: (modelCfg?.scale[2] ?? 1) * (modelCfg?.baseHeight ?? 1),
                    rotX: modelCfg?.rotation[0] ?? 0,
                    rotY: modelCfg?.rotation[1] ?? 0,
                    rotZ: modelCfg?.rotation[2] ?? 0,
                    offX: modelCfg?.offset[0] ?? 0,
                    offY: modelCfg?.offset[1] ?? 0,
                    offZ: modelCfg?.offset[2] ?? 0,
                    elevationOffset: p.elevation - ((p as any).terrainElevation || 0)
                },
                geometry: {
                    type: 'Point',
                    coordinates: [p.coordinates.lng, p.coordinates.lat, 0]
                }
            } as Tower3DFeature;
        });

        return {
            type: 'FeatureCollection',
            features
        };
    }
};
