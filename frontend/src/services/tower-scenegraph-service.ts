import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import { GLTFLoader } from '@loaders.gl/gltf';
import { TowerPhysics } from './tower-physics';
import { CableSettings } from '../components/map/cable-config-modal';
import { TowerAnchorService } from './tower-anchor-service';

export interface TowerScenegraphOptions {
    towerVerticalOffset: number;
    globalScale?: number;
    terrainRevision?: number;
    getTerrainElevation?: (lng: number, lat: number) => number;
    cableSettings?: CableSettings | null;
    localModelUrl?: string;
    projectAnchors?: Record<string, any[]>;
    templateAnchors?: Record<string, any[]>;
}

const DEFAULT_MODEL_URL = '/models/towers/scene.gltf';

export const TowerScenegraphService = {
    getLayers: (towers: any[], options: TowerScenegraphOptions, alignments?: Map<string, number>, onClick?: (info: any) => void): any[] => {
        if (!options || towers.length === 0) return [];

        const visibleTowers = towers.filter(t => t.visible !== false && !t.isHidden && !t.is_hidden);
        
        const baseModelUrl = options.localModelUrl || DEFAULT_MODEL_URL;
        const fallbackModel = baseModelUrl.startsWith('/') 
            ? `${window.location.origin}${baseModelUrl}` 
            : baseModelUrl;

        // Gerar pontos de base (pés) para referência visual 10x10m
        const baseAnchorsData: any[] = [];
        if (options.cableSettings) {
            visibleTowers.forEach(t => {
                const projectList = (options.projectAnchors?.[t.id] || []);
                const templateList = (options.templateAnchors?.[t.towerId] || options.templateAnchors?.['default'] || []);
                const towerAnchors = [...projectList, ...templateList];

                const baseAnchors = towerAnchors.filter((a: any) => {
                    const name = (a.name || '').toUpperCase();
                    return name.includes('BASE') || name.includes('FIXAÇÃO') || name.includes('FIXACAO') || name.includes('PE') || name.includes('PÉ');
                });

                baseAnchors.forEach(ba => {
                    try {
                        const pos = TowerAnchorService.getAnchor({
                            tower: t,
                            config: { id: ba.id || ba.name, label: ba.name, h: 0, vRatio: 0, color: '#ff0000', width: 1, enabled: true, manualAnchorName: ba.name },
                            role: 'vante',
                            placemarkOverrides: {},
                            cableSettings: options.cableSettings!,
                            projectAnchors: options.projectAnchors || {},
                            templateAnchors: options.templateAnchors || {},
                            localModelUrl: baseModelUrl,
                            getEffectiveTransform: (i: any) => i,
                            globalScale: options.globalScale,
                            getTerrainElevation: options.getTerrainElevation
                        });
                        baseAnchorsData.push({
                            position: [pos.x, pos.y, pos.z + 0.2], // Usa o Z absoluto calculado pelo AnchorService
                            towerId: t.id,
                            name: ba.name
                        });
                    } catch (e) {}
                });
            });
        }

        const towerLayer = new ScenegraphLayer({
            id: 'tower-scenegraph-layer',
            data: visibleTowers,
            scenegraph: fallbackModel,
            getPosition: (d: any) => {
                const globalOffset = options.cableSettings?.towerVerticalOffset ?? options.towerVerticalOffset ?? 0;
                const terrainElev = options.getTerrainElevation ? options.getTerrainElevation(d.coordinates.lng, d.coordinates.lat) : 0;
                
                // FÓRMULA SOLICITADA: Elevação do terreno (cota base ground) + offset global adicionado
                // Fallback para d.elevation caso o Mapbox ainda não tenha carregado o terreno localmente
                const baseElevation = terrainElev || d.elevation || d.coordinates?.altitude || 0;
                const calculatedZ = baseElevation + globalOffset;
                
                return [d.coordinates.lng, d.coordinates.lat, calculatedZ];
            },
            getOrientation: ((d: any, { index, data }: any): [number, number, number] => {
                const manualBearing = alignments?.get(d.id);
                const bearing = manualBearing !== undefined ? manualBearing : TowerPhysics.calculateTowerBearing(index, data, options.cableSettings?.alignmentMethod);
                const manualRot = (d as any).rotation || (d as any).rotationZ || 0;
                const deflection = (d as any).deflection || 0;
                const yaw = (360 - bearing - deflection - manualRot + 90) % 360;
                
                // Orientação Fixa: [0, yaw, 90] conforme solicitado para ficar de pé
                return [0, yaw, 90];
            }) as any,
            getScale: ((d: any): [number, number, number] => {
                const targetH = d.towerHeight || 30;
                const intrinsicH = 1.0;
                // Divisor 60 restaurado para manter a escala visual correta do modelo
                const scaleMultiplier = (options.globalScale ?? 100)/30;
                const scale = (targetH / intrinsicH) * scaleMultiplier;
                return [scale, scale, scale];
            }) as any,
            getTranslation: [0, 0, 0],
            pickable: true,
            onClick: onClick,
            opacity: 1,
            visible: true,
            sizeScale: 1,
            parameters: {
                depthTest: true,
            },
            loaders: [GLTFLoader],
            updateTriggers: {
                getPosition: [visibleTowers.length, options.towerVerticalOffset, options.terrainRevision],
                getOrientation: [visibleTowers.length],
                getScale: [visibleTowers.length, options.globalScale],
                onClick: [onClick]
            }
        });

        // Debug layer (Ponto Central de Referência - Vermelho 10x10m)
        const debugLayer = new ScatterplotLayer({
            id: 'tower-base-indicator',
            data: visibleTowers,
            getPosition: (d: any) => {
                const terrainElev = options.getTerrainElevation ? options.getTerrainElevation(d.coordinates.lng, d.coordinates.lat) : 0;
                const globalOffset = options.cableSettings?.towerVerticalOffset ?? options.towerVerticalOffset ?? 0;
                const baseElevation = terrainElev || d.elevation || d.coordinates?.altitude || 0;
                return [d.coordinates.lng, d.coordinates.lat, baseElevation + globalOffset + 0.1];
            },
            getRadius: 5, // 10 metros de diâmetro (área 10x10)
            radiusUnits: 'meters',
            getFillColor: [255, 0, 0, 255], // Vermelho Puro
            stroked: true,
            getLineColor: [0, 0, 0, 255],
            getLineWidth: 1,
            lineWidthUnits: 'meters',
            pickable: true,
            parameters: { depthTest: true }
        });

        // Layer para os Pés/Base da Torre (Pontos de Referência Específicos 10x10m)
        const basePointsLayer = new ScatterplotLayer({
            id: 'tower-base-corners-layer',
            data: baseAnchorsData,
            getPosition: (d: any) => d.position,
            getRadius: 5,
            radiusUnits: 'meters',
            getFillColor: [255, 0, 0, 150],
            stroked: true,
            getLineColor: [255, 255, 255, 255],
            getLineWidth: 0.5,
            lineWidthUnits: 'meters',
            pickable: true,
            parameters: { depthTest: true }
        });

        return [towerLayer, debugLayer, basePointsLayer];
    }
};
