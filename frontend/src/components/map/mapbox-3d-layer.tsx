import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEnrichedPlacemarks } from '@/hooks/useEnrichedPlacemarks';
import { Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { KMLDocument, KMLPlacemark } from '@/types/kmz';
import { Box, X, TowerControl as Tower, Navigation, Settings, Ruler, Maximize, RotateCcw, Move, RefreshCw, Save as SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMap } from 'react-map-gl/mapbox';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { PathLayer } from '@deck.gl/layers';
import { useControl } from 'react-map-gl/mapbox';
import { Cable } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';


import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ModelTransform, CableSettings, DEFAULT_CABLE_SETTINGS } from '@/components/map/cable-config-modal';
import { TowerPhysics } from '@/services/tower-physics';
import { CableLayerService } from '@/services/cable-layer';
import { TowerScenegraphService } from '@/services/tower-scenegraph-service';
import { orionApi } from '@/integrations/orion/client';
import { STANDARD_PROJECT_ID } from '@/services/anchorService';

const LOCAL_MODEL_ID = 'industrial-tower';
const LOCAL_MODEL_URL = `${window.location.origin}/models/towers/scene.gltf`;

function DeckGLOverlay(props: Record<string, unknown>) {
    const overlay = useControl<MapboxOverlay>(
        () => new MapboxOverlay(props),
        ({ map }: { map: unknown }) => {
            if (map && (map as Record<string, unknown>).removeControl) {
                // MapboxOverlay remove is handled by useControl
            }
        }
    );

    useEffect(() => {
        if (overlay) {
            overlay.setProps(props);
        }
    }, [props, overlay]);

    return null;
}

interface Mapbox3DLayerProps {
    kmlDocuments: KMLDocument[];
    show3D: boolean;
    selectedPlacemark?: KMLPlacemark | null;
    onSelectPlacemark?: (placemark: KMLPlacemark | null) => void;
    hiddenPlacemarkIds?: Set<string>;
    placemarkOverrides?: Record<string, {
        name?: string,
        angle?: number,
        color?: string,
        texture?: string,
        height?: number,
        elevation?: number,
        customModelUrl?: string,
        customModelTransform?: ModelTransform
    }>;
    onHidePlacemark?: (docId: string, placemark: KMLPlacemark) => void;
    onUpdatePlacemarkAngle?: (docId: string, elementId: string, newAngle: number) => void;
    onUpdatePlacemarkColor?: (docId: string, elementId: string, newColor: string) => void;
    onUpdatePlacemarkTexture?: (docId: string, elementId: string, newTexture: string) => void;
    onUpdatePlacemarkHeight?: (docId: string, elementId: string, newHeight: number) => void;
    onUpdatePlacemarkElevation?: (docId: string, elementId: string, newElevation: number) => void;
    onUpdatePlacemarkModel?: (docId: string, elementId: string, modelUrl: string) => void;
    onUpdatePlacemarkTransform?: (docId: string, elementId: string, transform: ModelTransform) => void;
    projectSpans?: unknown[];
    projectId?: string;
    cableSettings?: CableSettings;
    onUpdateCableSettings?: (settings: CableSettings) => Promise<void>;
    canUpdate?: boolean;
}

// Preset colors for quick selection
const PRESET_COLORS = [
    '#10b981', // emerald
    '#22c55e', // green
    '#84cc16', // lime
    '#eab308', // yellow
    '#f59e0b', // amber
    '#f97316', // orange
    '#ef4444', // red
    '#f43f5e', // rose
    '#ec4899', // pink
    '#d946ef', // fuchsia
    '#8b5cf6', // violet
    '#6366f1', // indigo
    '#3b82f6', // blue
    '#06b6d4', // cyan
    '#14b8a6', // teal
    '#ffffff', // white
    '#94a3b8', // slate
];

const dmsToDecimal = (dms: string): number => {
    if (!dms || dms === '0') return 0;
    try {
        // Parse simple decimal first if no formatting
        // Accepts: 145, 145.5, -45.
        // Rejects: 145SE, 145°
        if (!/[°'"a-z]/i.test(dms)) {
            const num = parseFloat(dms.replace(',', '.'));
            return isNaN(num) ? 0 : num;
        }

        // Regex robusto para DMS com ou sem segundos e direção opcional (1 ou 2 letras)
        // Groups: 1=Deg, 2=Min, 3=Sec, 4=Dir
        const parts = dms.match(/(\d+(?:\.\d+)?)[°|\s]?\s*(?:(\d+(?:\.\d+)?)['|\s]?)?\s*(?:(\d+(?:\.\d+)?)"?)?\s*([NSEW]{1,2})?/i);

        if (!parts) {
            const normalized = dms.replace(',', '.').replace(/[^\d.-]/g, '');
            const num = parseFloat(normalized);
            return isNaN(num) ? 0 : num;
        }

        const degrees = parseFloat(parts[1]);
        const minutes = parts[2] ? parseFloat(parts[2]) : 0;
        const seconds = parts[3] ? parseFloat(parts[3]) : 0;
        const direction = parts[4]?.toUpperCase();

        const dd = degrees + (minutes / 60) + (seconds / 3600);

        // Ajuste básico de direção se necessário (embora azimute geralmente seja 0-360 direto)
        // Se a direção for S ou W, E assumirmos que isso é uma coordenada geográfica, invertemos.
        // Se for um Azimute (Heading), S=180, SW=225, W=270.
        // SE o valor ja for > 90 (ex 145), o sufixo SE é redundante.
        // Vamos apenas ignorar o sufixo se o valor parecer ser um Azimute valido.

        return dd;
    } catch (err) {
        console.error("Erro parsing DMS:", err);
        const num = parseFloat(dms.replace(',', '.').replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
    }
};


export function Mapbox3DLayer({
    kmlDocuments,
    show3D,
    selectedPlacemark,
    onSelectPlacemark,
    hiddenPlacemarkIds = new Set(),
    placemarkOverrides = {},
    onHidePlacemark,
    onUpdatePlacemarkAngle,
    onUpdatePlacemarkColor,
    onUpdatePlacemarkHeight,
    onUpdatePlacemarkElevation,
    onUpdatePlacemarkModel,
    onUpdatePlacemarkTransform,
    onUpdatePlacemarkTexture,
    projectSpans = [],
    projectId,
    cableSettings: propCableSettings,
    onUpdateCableSettings,
    canUpdate = false
}: Mapbox3DLayerProps) {
    const { current: map } = useMap();
    const { toast } = useToast();
    const [zoom, setZoom] = useState(map?.getZoom() || 0);
    const [terrainRevision, setTerrainRevision] = useState(0);
    const [viewportBounds, setViewportBounds] = useState<any>(map?.getBounds());

    // Helper to normalize tower names for stable matching
    const normalizeName = (name: string) => (name || '').trim().toUpperCase();

    // Helper to calculate bearing between two points - Using TowerPhysics
    const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        return TowerPhysics.calculateBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    };

    // Helper to extract numeric ID for sorting
    const getNumericId = (p: Record<string, any>) => {
        const tId = p.id || p.name;
        const meta = towerMetadata[tId];

        // Priority 1: Professional KM/Index metadata
        if (meta && meta.technicalKm !== undefined && meta.technicalIndex !== undefined) {
            return (meta.technicalKm * 10000) + meta.technicalIndex;
        }

        // Priority 2: sequence or object_seq from DB
        if (p.sequence !== undefined && p.sequence !== null) return p.sequence;
        if (p.object_seq !== undefined && p.object_seq !== null) return p.object_seq;

        // Priority 3: Name parsing (0/1, 0/2)
        const name = p.name || '';
        const upper = name.toUpperCase();
        if (upper.includes('TRIO') || upper.includes('SUB') || upper.includes('SE ') || upper.includes('BOP')) {
            const m = upper.match(/\d+/);
            return m ? parseInt(m[0]) : 0;
        }
        // Support suffixes like 1/1A, 1/1B
        const parts = upper.match(/(\d+)\/(\d+)([A-Z])?/);
        if (parts) {
            let val = parseInt(parts[1]) * 10000; // Structure (e.g. 202)
            val += parseInt(parts[2]) * 100;      // Sequence (e.g. 1)

            if (parts[3]) {
                val += (parts[3].charCodeAt(0) - 64);
            }
            return val;
        }
        const simple = upper.match(/\d+/);
        return simple ? parseInt(simple[0]) + 1000 : 2000;
    };
    const [mapCenter, setMapCenter] = useState(map?.getCenter());
    const [isAngleDialogOpen, setIsAngleDialogOpen] = useState(false);
    const [editingAngleValue, setEditingAngleValue] = useState('');
    const [editingAngleElement, setEditingAngleElement] = useState<{ docId: string; elementId: string } | null>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    // Estados para edição de altura e elevação
    const [isHeightDialogOpen, setIsHeightDialogOpen] = useState(false);
    const [editingHeightValue, setEditingHeightValue] = useState('');
    const [editingHeightElement, setEditingHeightElement] = useState<{ docId: string; elementId: string } | null>(null);
    const [isElevationDialogOpen, setIsElevationDialogOpen] = useState(false);
    const [editingElevationValue, setEditingElevationValue] = useState('');
    const [editingElevationElement, setEditingElevationElement] = useState<{ docId: string; elementId: string } | null>(null);

    const [isTransformDialogOpen, setIsTransformDialogOpen] = useState(false);
    const [editingTransform, setEditingTransform] = useState<ModelTransform | null>(null);
    const [editingTransformTarget, setEditingTransformTarget] = useState<{ docId: string; elementId: string } | null>(null);

    // Estado para exclusão de vãos
    const [isDeleteSpanDialogOpen, setIsDeleteSpanDialogOpen] = useState(false);
    // Visual fix: Armazena IDs de pares ocultados localmente
    const [hiddenSpans, setHiddenSpans] = useState<Set<string>>(new Set());
    const [disconnectingSpan, setDisconnectingSpan] = useState<{
        id: string;
        start: string;
        end: string;
        towerStartId?: string;
        towerEndId?: string;
        source?: string;
        projectId?: string;
    } | null>(null);

    const [projectAnchors, setProjectAnchors] = useState<Record<string, any[]>>({});
    const [templateAnchors, setTemplateAnchors] = useState<Record<string, any[]>>({});
    const [towerMetadata, setTowerMetadata] = useState<Record<string, any>>({});

    // Manual Connection State
    const [isConnectingMode, setIsConnectingMode] = useState(false);
    const [firstTowerToConnect, setFirstTowerToConnect] = useState<KMLPlacemark | null>(null);
    const [isAutoConnecting, setIsAutoConnecting] = useState(false);

    // Anchor Repositioning State
    const [isPickingAnchorPosition, setIsPickingAnchorPosition] = useState(false);
    const [pickingAnchorTowerId, setPickingAnchorTowerId] = useState<string | null>(null);
    const [pickingAnchorId, setPickingAnchorId] = useState<string | null>(null);
    const [pickingPhaseId, setPickingPhaseId] = useState<string | null>(null);

    const handleConnectTowers = async (targetTower: KMLPlacemark) => {
        if (!projectId || !firstTowerToConnect) return;

        try {
            const startTower = firstTowerToConnect;
            const endTower = targetTower;

            const sourceName = startTower.extendedData?.object_id || startTower.extendedData?.objectId || startTower.name;
            const targetName = endTower.extendedData?.object_id || endTower.extendedData?.objectId || endTower.name;

            // Simplified drivers for manual connection
            const drivers = ['A', 'B', 'C'].map(phase => ({
                phase,
                cableType: 'Manual-Connect',
                voltageKv: 0,
                cableColor: '#0ea5e9'
            }));

            const { error } = await orionApi
                .from('segments')
                .insert({
                    projectId: projectId,
                    towerStartId: sourceName,
                    towerEndId: targetName,
                    spanLength: 0,
                    elevationStart: parseFloat((startTower.extendedData as any)?.object_height) || 30,
                    conductors: drivers
                });

            if (error) throw error;

            toast({
                title: "Conexão Realizada",
                description: `Vão criado entre ${startTower.name} e ${endTower.name}.`
            });

        } catch (err: any) {
            console.error('Error connecting towers:', err);
            toast({
                title: "Erro ao conectar",
                description: err.message || "Não foi possível criar a conexão.",
                variant: "destructive"
            });
        } finally {
            setIsConnectingMode(false);
            setFirstTowerToConnect(null);
            // Re-fetch spans handled by parent or window trigger
            if (typeof (window as any).refetchSpans === 'function') {
                (window as any).refetchSpans();
            }
        }
    };

    const handleAutoConnectAll = async () => {
        if (!projectId || projectId === 'all') {
            toast({
                title: "Ação não permitida",
                description: "Selecione uma obra específica para auto-conectar.",
                variant: "destructive"
            });
            return;
        }

        if (!window.confirm("Isso irá criar conexões sequenciais entre todas as torres desta obra. Deseja continuar?")) {
            return;
        }

        setIsAutoConnecting(true);
        try {
            const { data: towers, error } = await orionApi
                .from('map_elements')
                .select('*')
                .eq('projectId', projectId)
                .eq('type', 'TOWER')
                .order('object_seq', { ascending: true });

            if (error) throw error;
            if (!towers || towers.length < 2) {
                toast({
                    title: "Dados insuficientes",
                    description: "A obra precisa de pelo menos 2 torres para criar conexões.",
                    variant: "destructive"
                });
                return;
            }

            let createdCount = 0;
            for (let i = 0; i < towers.length - 1; i++) {
                const src = towers[i];
                const tgt = towers[i + 1];

                const sourceName = src.object_id || src.objectId || src.name;
                const targetName = tgt.object_id || tgt.objectId || tgt.name;

                const drivers = ['A', 'B', 'C'].map(phase => ({
                    phase,
                    cableType: 'Auto-Sequence',
                    voltageKv: 0,
                    cableColor: '#0ea5e9'
                }));

                const { error: insertError } = await orionApi
                    .from('segments')
                    .insert({
                        projectId: projectId,
                        towerStartId: sourceName,
                        towerEndId: targetName,
                        spanLength: 0,
                        elevationStart: parseFloat(src.object_height) || 30,
                        conductors: drivers
                    });

                if (!insertError) createdCount++;
            }

            toast({
                title: "Auto-Conexão Concluída",
                description: `${createdCount} novos vãos foram gerados sequencialmente.`,
            });

            if (typeof (window as any).refetchSpans === 'function') {
                (window as any).refetchSpans();
            }

        } catch (err: any) {
            console.error('Error in AutoConnect:', err);
            toast({
                title: "Erro na Auto-Conexão",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsAutoConnecting(false);
        }
    };

    // Fetch all project anchors for 3D linkage
    useEffect(() => {
        if (!projectId) return;

        const fetchAnchors = async () => {
            try {
                // Instance-specific anchors
                const response = await fetch(`/api/v1/anchors?projectId=${projectId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.anchorsMap) {
                        setProjectAnchors(data.anchorsMap);
                        setTowerMetadata(data.towerMetadata || {});
                    } else {
                        // Support legacy format if necessary (though we just updated it)
                        setProjectAnchors(data);
                    }
                }

                // Global Model Templates
                const tResponse = await fetch(`/api/v1/anchors?projectId=${STANDARD_PROJECT_ID}`);
                if (tResponse.ok) {
                    const tData = await tResponse.json();
                    setTemplateAnchors(tData);
                }
            } catch (err) {
                console.error("Failed to fetch project anchors/templates:", err);
            }
        };

        fetchAnchors();
    }, [projectId]);

    const handleCableClick = (info: any, _x: number, _y: number) => {
        if (!info.object || !canUpdate) return;

        console.log('🔌 Handle Cable Click:', info.object);

        setDisconnectingSpan({
            id: info.object.id,
            start: info.object.towerStartName || 'Desconhecido A',
            end: info.object.towerEndName || 'Desconhecido B',
            towerStartId: info.object.towerStartId,
            towerEndId: info.object.towerEndId,
            source: info.object.sourceType,
            projectId: info.object.projectId
        });
        setIsDeleteSpanDialogOpen(true);
    };

    // Use cable settings from props if provided, otherwise fallback to defaults
    // Merge with defaults to ensure all properties exist
    const cableSettings = useMemo(() => {
        return {
            ...DEFAULT_CABLE_SETTINGS,
            ...propCableSettings,
            anchors: propCableSettings?.anchors || DEFAULT_CABLE_SETTINGS.anchors
        };
    }, [propCableSettings]);

    const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

    // Update zoom and center state for reactivity, and refresh terrain elevation
    useEffect(() => {
        if (!map) return;

        const updateState = () => {
            setZoom(map.getZoom());
            setMapCenter(map.getCenter());
        };

        // Listen for idle to ensure terrain is fully loaded at the current view
        const handleIdle = () => {
            setTerrainRevision(prev => prev + 1);
        };

        const onMoveEnd = () => {
            updateState();
            if (map) setViewportBounds(map.getBounds());
        };

        map.on('moveend', onMoveEnd);
        map.on('zoomend', onMoveEnd);
        map.on('idle', handleIdle);

        // Initial state
        updateState();
        if (map) setViewportBounds(map.getBounds());

        return () => {
            map.off('moveend', onMoveEnd);
            map.off('zoomend', onMoveEnd);
            map.off('idle', handleIdle);
        };
    }, [map]);

    const openInGPS = () => {
        if (!selectedPlacemark) return;
        const { lat, lng } = selectedPlacemark.coordinates;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    };

    // Helper to get consistent model IDs from URLs
    const getModelId = (url: string) => {
        if (!url || url === LOCAL_MODEL_URL) return LOCAL_MODEL_ID;
        const parts = url.split('/');
        const fileName = parts.pop()?.split('?')[0] || 'custom';
        const parentDir = parts.pop() || '';
        const combo = parentDir ? `${parentDir}-${fileName}` : fileName;
        return `model-${combo.replace(/[^a-zA-Z0-9-]/g, '_')}`;
    };

    // Register all necessary models in Mapbox style
    const allModelUrls = useMemo(() => {
        const urls = new Set<string>();
        urls.add(cableSettings?.customModelUrl || LOCAL_MODEL_URL);

        // Add models from patterns (e.g. TRIO ports)
        // urls.add(`${window.location.origin}/models/PORTICO-001/scene.gltf`); // MODELO CORROMPIDO

        // Add models from overrides
        Object.values(placemarkOverrides).forEach(ov => {
            if (ov.customModelUrl) urls.add(ov.customModelUrl);
        });

        return Array.from(urls).filter(url => !url.startsWith('procedural-'));
    }, [cableSettings?.customModelUrl, placemarkOverrides]);

    const registeredModels = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!map || !show3D) return;

        const registerModelsAndTextures = () => {
            // 1. Models
            allModelUrls.forEach(url => {
                const id = getModelId(url);
                if (!map.hasModel(id)) {
                    try {
                        console.log(`🏗️ [3D] Registering model: ${id} from ${url}`);
                        map.addModel(id, url);
                        registeredModels.current.add(id);
                    } catch (e) {
                        console.error(`❌ Erro ao carregar modelo 3D (${id}):`, e);
                    }
                }
            });

            // 2. Procedural Textures (Canvas)
            const textures = [
                { id: 'texture-metal-light', color: [212, 212, 216], type: 'metal' },
                { id: 'texture-metal-medium', color: [161, 161, 170], type: 'metal' },
                { id: 'texture-concrete-dark', color: [82, 82, 91], type: 'concrete' },
                { id: 'texture-rust', color: [124, 45, 18], type: 'rust' }, // #7c2d12 (amber-900)
                { id: 'texture-warning', color: [234, 179, 8], type: 'stripes' }, // #eab308 (yellow-500)
                { id: 'texture-wood', color: [113, 63, 18], type: 'wood' } // #78350f (amber-900)
            ];

            textures.forEach(tex => {
                if (map.hasImage(tex.id)) return;

                const size = 64;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Base Fill
                ctx.fillStyle = `rgb(${tex.color[0]}, ${tex.color[1]}, ${tex.color[2]})`;
                ctx.fillRect(0, 0, size, size);

                // Specific Patterns
                if (tex.type === 'stripes') {
                    // Warning Stripes (Black/Yellow)
                    ctx.fillStyle = 'rgba(0,0,0,0.8)';
                    ctx.beginPath();
                    for (let x = -size; x < size * 2; x += 16) {
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x - 8, size);
                        ctx.lineTo(x + 8, size);
                        ctx.lineTo(x + 16, 0);
                    }
                    ctx.fill();
                } else if (tex.type === 'wood') {
                    // Wood Grain
                    ctx.strokeStyle = 'rgba(60, 20, 0, 0.3)';
                    for (let i = 0; i < 10; i++) {
                        ctx.beginPath();
                        ctx.moveTo(0, Math.random() * size);
                        ctx.bezierCurveTo(
                            size / 3, Math.random() * size,
                            2 * size / 3, Math.random() * size,
                            size, Math.random() * size
                        );
                        ctx.lineWidth = 1 + Math.random() * 2;
                        ctx.stroke();
                    }
                } else if (tex.type === 'rust') {
                    // Heavy Rust Noise
                    for (let i = 0; i < size * size; i++) {
                        if (Math.random() > 0.4) {
                            const x = Math.random() * size;
                            const y = Math.random() * size;
                            const alpha = Math.random() * 0.4;
                            ctx.fillStyle = Math.random() > 0.5 ? `rgba(60, 20, 0, ${alpha})` : `rgba(160, 80, 20, ${alpha})`;
                            ctx.fillRect(x, y, 2, 2);
                        }
                    }
                }

                // General Noise (Grain) for all non-stripes
                if (tex.type !== 'stripes') {
                    for (let i = 0; i < size; i += 2) {
                        for (let j = 0; j < size; j += 2) {
                            if (Math.random() > 0.8) {
                                const alpha = Math.random() * 0.1;
                                const shade = Math.random() > 0.5 ? 255 : 0;
                                ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
                                ctx.fillRect(i, j, 2, 2);
                            }
                        }
                    }

                    // Scratches
                    ctx.strokeStyle = `rgba(0,0,0,0.1)`;
                    ctx.lineWidth = 1;
                    for (let k = 0; k < 4; k++) {
                        ctx.beginPath();
                        const x = Math.random() * size;
                        const y = Math.random() * size;
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + (Math.random() - 0.5) * 15, y + (Math.random() - 0.5) * 15);
                        ctx.stroke();
                    }
                }

                // Border 
                ctx.strokeStyle = `rgba(0,0,0,0.15)`;
                ctx.lineWidth = 1;
                ctx.strokeRect(0, 0, size, size);

                const imgData = ctx.getImageData(0, 0, size, size);
                map.addImage(tex.id, imgData, { pixelRatio: 1 });
            });
        };

        if (map.isStyleLoaded()) {
            registerModelsAndTextures();
        } else {
            map.once('style.load', registerModelsAndTextures);
        }
    }, [map, allModelUrls, show3D]);

    // Get transform config for a given model URL
    // IMPORTANT: If the URL is LOCAL_MODEL_URL (default model), also check 'default' key
    const getModelConfig = (url: string) => {
        // First, try the exact key
        const exactKey = url || 'default';
        const exactConfig = cableSettings?.modelConfigs?.[exactKey];
        if (exactConfig) return exactConfig;

        // If using the LOCAL_MODEL_URL (built-in tower), also check the 'default' key
        if (url === LOCAL_MODEL_URL) {
            return cableSettings?.modelConfigs?.['default'];
        }

        return undefined;
    };

    // Helper: Merge individual transform with model defaults, applying global Yaw when individual is 0 or undefined
    const getEffectiveTransform = (individualTransform: ModelTransform | undefined, modelUrl: string) => {
        const modelCfg = getModelConfig(modelUrl);


        // If no individual transform, use model config entirely
        if (!individualTransform) {
            return modelCfg;
        }

        // If individual transform exists but Yaw (rotation[2]) is 0, inherit from model default
        const individualYaw = individualTransform.rotation?.[2] ?? 0;
        const defaultYaw = modelCfg?.rotation?.[2] ?? 0;

        // Apply default Yaw if individual is 0 and default is non-zero
        if (individualYaw === 0 && defaultYaw !== 0) {
            return {
                ...individualTransform,
                rotation: [
                    individualTransform.rotation?.[0] ?? 0,
                    individualTransform.rotation?.[1] ?? 0,
                    defaultYaw // Use the global default Yaw
                ] as [number, number, number]
            };
        }

        return individualTransform;
    };




    const isZoomedIn = zoom > 13.5; // Aproximadamente 1000m de distância
    const isVeryClose = zoom > 18;  // Aproximadamente 100m de distância (modo detalhado na superfície)

    // Filter placemarks - heading will come from database via extendedData
    const enrichedPlacemarks = useEnrichedPlacemarks(kmlDocuments, placemarkOverrides, hiddenPlacemarkIds, projectId);

    // Simplified enriched placemarks with distance filtering + Reference Point Correction
    const visibleTowers = useMemo(() => {
        if (!mapCenter) return [];

        const MAX_DISTANCE_METERS = 10000;
        const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371e3;
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        // 1. Separate Towers and Reference Points
        const potentialTowers: any[] = [];
        const referencePoints: any[] = [];

        enrichedPlacemarks.forEach(p => {
            // Check implicit type from useEnrichedPlacemarks
            if ((p as any).isReferencePoint) {
                referencePoints.push(p);
            } else {
                potentialTowers.push(p);
            }
        });

        // 2. Map towers and apply correction if a reference point is nearby
        const correctedTowers = potentialTowers.map(t => {
            let bestAlt = t.elevation;
            let foundRef = false;

            // Find nearest reference point within 40m
            let minDist = 40;

            for (const ref of referencePoints) {
                const d = getDist(t.coordinates.lat, t.coordinates.lng, ref.coordinates.lat, ref.coordinates.lng);
                if (d < minDist) {
                    minDist = d;
                    // Prefer elevation from metadata, fallback to coordinates
                    bestAlt = ref.elevation !== undefined && ref.elevation !== 0 ? ref.elevation : ref.coordinates.altitude;
                    foundRef = true;
                }
            }

            if (foundRef) {
                // Return new object with corrected elevation
                return { ...t, elevation: bestAlt, isCorrected: true };
            }
            return t;
        });

        // 3. Keep all towers (Preserve hidden towers for cable logic)
        return correctedTowers.sort((a, b) => getNumericId(a) - getNumericId(b));
    }, [enrichedPlacemarks, mapCenter, hiddenPlacemarkIds]);

    // 4. Resolve Terrain Elevation for towers that lack it
    const towersWithTerrain = useMemo(() => {
        if (!map) return visibleTowers;

        return visibleTowers.map((p, idx) => {
            const docId = (p as any).document_id || '';
            const compositeId = `${docId}:::${p.id}`;
            const override = placemarkOverrides[compositeId];
            const extData = p.extendedData as any;

            // NEW Priority: Override > Terrain Query (Surface Snap) > DB Elevation > fallback 0
            // IMPORTANT: We ignore p.coordinates.altitude from KMZ because it's often ellipsoidal 
            // and causes objects to float hundreds of meters above the visual terrain.
            const dbElevation = parseFloat(extData?.['elevation']) || parseFloat(extData?.['object_elevation']) || parseFloat(extData?.['objectElevation']) || p.coordinates.altitude || 0;
            const terrainElevAtPoint = map.queryTerrainElevation([p.coordinates.lng, p.coordinates.lat]);

            let currentElevation = override?.elevation;

            if (currentElevation === undefined || currentElevation === null) {
                // Priority: Terrain Query (if ready) > DB Elevation > fallback 0
                if (terrainElevAtPoint !== null && terrainElevAtPoint !== undefined && !isNaN(terrainElevAtPoint) && terrainElevAtPoint !== 0) {
                    currentElevation = terrainElevAtPoint;
                } else {
                    currentElevation = dbElevation;
                }
            }


            const currentHeight = override?.height ?? p.towerHeight;

            // NEW: Calculate professional bearing (using configured method)
            const currentHeading = TowerPhysics.calculateTowerBearing(idx, visibleTowers, cableSettings.alignmentMethod);

            return {
                ...p,
                elevation: currentElevation,
                terrainElevation: terrainElevAtPoint,
                towerHeight: currentHeight,
                calculatedHeading: currentHeading
            };
        });
    }, [visibleTowers, map, placemarkOverrides, terrainRevision]); // Included terrainRevision to force refresh

    // 5. Apply Spatial Chunking for Rendering Performance
    const chunkedTowers = useMemo(() => {
        if (!viewportBounds || towersWithTerrain.length < 50) return towersWithTerrain;

        // Buffers de segurança (em graus - aprox 2.2km lat / var lng)
        const LAT_BUFFER = 0.02;
        const LNG_BUFFER = 0.03;

        const west = viewportBounds.getWest() - LNG_BUFFER;
        const east = viewportBounds.getEast() + LNG_BUFFER;
        const south = viewportBounds.getSouth() - LAT_BUFFER;
        const north = viewportBounds.getNorth() + LAT_BUFFER;

        return towersWithTerrain.filter(t => {
            const lng = t.coordinates.lng;
            const lat = t.coordinates.lat;
            return lng >= west && lng <= east && lat >= south && lat <= north;
        });
    }, [towersWithTerrain, viewportBounds]);

    // Anchor Repositioning Logic
    useEffect(() => {
        if (!map || !isPickingAnchorPosition || !pickingAnchorTowerId) return;

        // Disable all map interactions to prevent camera movement while picking
        const originalInteractions = {
            dragPan: map.dragPan?.isEnabled(),
            scrollZoom: map.scrollZoom?.isEnabled(),
            boxZoom: map.boxZoom?.isEnabled(),
            dragRotate: map.dragRotate?.isEnabled(),
            doubleClickZoom: map.doubleClickZoom?.isEnabled(),
            keyboard: map.keyboard?.isEnabled(),
            touchZoomRotate: map.touchZoomRotate?.isEnabled(),
            touchPitch: map.touchPitch?.isEnabled()
        };

        map.dragPan?.disable();
        map.scrollZoom?.disable();
        map.boxZoom?.disable();
        map.dragRotate?.disable();
        map.doubleClickZoom?.disable();
        map.keyboard?.disable();
        map.touchZoomRotate?.disable();
        map.touchPitch?.disable();

        const onMapClick = (e: any) => {
            // Only left click
            if (!e.originalEvent || e.originalEvent.button !== 0) return;

            e.preventDefault();

            // Find the tower
            const tower = towersWithTerrain.find(t => t.id === pickingAnchorTowerId);
            if (!tower) return;

            // Calculate Delta in Meters
            const clickLng = e.lngLat.lng;
            const clickLat = e.lngLat.lat;
            const towerLng = tower.coordinates.lng;
            const towerLat = tower.coordinates.lat;

            // Meters conversion
            const mToDegLat = 1 / 111320;
            const mToDegLng = 1 / (111320 * Math.cos(towerLat * Math.PI / 180));

            const dx_raw = (clickLng - towerLng) / mToDegLng;
            const dy_raw = (clickLat - towerLat) / mToDegLat;
            const dz = 0;

            // Movement Limit (Constraint) - Request: "só movimentar dentro da area da torre!!"
            const MAX_DISTANCE = 30; // 15 meters
            const distance = Math.sqrt(dx_raw * dx_raw + dy_raw * dy_raw);

            let dx = dx_raw;
            let dy = dy_raw;

            if (distance > MAX_DISTANCE) {
                const ratio = MAX_DISTANCE / distance;
                dx *= ratio;
                dy *= ratio;
                toast({
                    title: "Limite Atingido! 🛡️",
                    description: `O ajuste foi limitado a ${MAX_DISTANCE}m da torre para manter a integridade.`,
                    variant: "destructive"
                });
            }

            // Save to overrides
            const docId = (tower as any).document_id || (tower as any).projectId || (tower as any).project_id;
            const compositeId = `${docId}:::${tower.id}`;
            const currentOverride = placemarkOverrides[compositeId];

            const currentTransform = getEffectiveTransform(currentOverride?.customModelTransform, currentOverride?.customModelUrl || LOCAL_MODEL_URL);

            const newTransform: ModelTransform = {
                ...currentTransform,
                scale: currentTransform?.scale || [1, 1, 1],
                rotation: currentTransform?.rotation || [0, 0, 0],
                offset: currentTransform?.offset || [0, 0, 0],
                baseHeight: currentTransform?.baseHeight || 1,
            };

            if (pickingPhaseId) {
                // Group Phase Override (Requested: "os 4 cabos de 1 vez")
                newTransform.phaseOverrides = {
                    ...(currentTransform?.phaseOverrides || {}),
                    [pickingPhaseId]: { x: dx, y: dy, z: dz }
                };
            } else if (pickingAnchorId) {
                // Individual Anchor Override
                newTransform.anchorOverrides = {
                    ...(currentTransform?.anchorOverrides || {}),
                    [pickingAnchorId]: { x: dx, y: dy, z: dz }
                };
            } else {
                // Global Tower Override
                newTransform.anchorGlobalOffset = { x: dx, y: dy, z: dz };
            }

            if (onUpdatePlacemarkTransform && docId) {
                onUpdatePlacemarkTransform(docId, tower.id, newTransform);
                toast({
                    title: pickingPhaseId ? `Grupo ${pickingPhaseId} Ajustado! ⚡` : (pickingAnchorId ? `Mísula ${pickingAnchorId} Ajustada! ⚡` : "Posição Fixada! ✅"),
                    description: `O ponto foi movido ${pickingPhaseId ? 'em grupo' : (pickingAnchorId ? 'individualmente' : 'globalmente')}.`,
                    duration: 4000
                });
            }

            // Exit mode
            setIsPickingAnchorPosition(false);
            setPickingAnchorTowerId(null);
            setPickingAnchorId(null);
            setPickingPhaseId(null);
        };

        map.on('click', onMapClick);
        map.getCanvas().style.cursor = 'crosshair';

        return () => {
            map.off('click', onMapClick);
            map.getCanvas().style.cursor = '';

            // Restore map interactions using original states
            if (originalInteractions.dragPan !== false) map.dragPan?.enable();
            if (originalInteractions.scrollZoom !== false) map.scrollZoom?.enable();
            if (originalInteractions.boxZoom !== false) map.boxZoom?.enable();
            if (originalInteractions.dragRotate !== false) map.dragRotate?.enable();
            if (originalInteractions.doubleClickZoom !== false) map.doubleClickZoom?.enable();
            if (originalInteractions.keyboard !== false) map.keyboard?.enable();
            if (originalInteractions.touchZoomRotate !== false) map.touchZoomRotate?.enable();
            if (originalInteractions.touchPitch !== false) map.touchPitch?.enable();
        };
    }, [map, isPickingAnchorPosition, pickingAnchorTowerId, pickingAnchorId, pickingPhaseId, towersWithTerrain, placemarkOverrides]);

    // Derive selected element (Tower or Span)
    const towerAlignments = useMemo(() => {
        const alignments = new Map<string, number>();

        towersWithTerrain.forEach((tower, index) => {
            const docId = (tower as any).document_id || '';
            const compositeId = `${docId}:::${tower.id}`;
            const override = placemarkOverrides[compositeId];

            // Get mode from individual override, or default to bisector
            const mode = override?.customModelTransform?.alignmentMode || 'bisector';
            const manualAngle = override?.customModelTransform?.alignmentManualAngle;

            if (mode === 'manual' && manualAngle !== undefined) {
                alignments.set(tower.id, manualAngle);
            } else {
                const bearing = TowerPhysics.calculateTowerBearing(
                    index,
                    towersWithTerrain,
                    mode === 'tangential' ? 'tangential' : 'bisector'
                );
                alignments.set(tower.id, bearing);
            }
        });

        return alignments;
    }, [towersWithTerrain, placemarkOverrides]);

    const selectedElement = useMemo(() => {
        if (!selectedPlacemark) return null;

        // Check if it's a Span (Virtual)
        if ((selectedPlacemark.extendedData as any)?.source === '3d_cable_virtual_layer') {
            return selectedPlacemark;
        }

        // Check if it's a Tower
        let found = towersWithTerrain.find(p => p.id === selectedPlacemark.id);
        if (!found) {
            const normalizedName = (selectedPlacemark.name || '').trim().toUpperCase();
            found = towersWithTerrain.find(p => (p.name || '').trim().toUpperCase() === normalizedName);
        }
        return found || selectedPlacemark;
    }, [selectedPlacemark, towersWithTerrain]);

    // Keyboard Navigation (WASD + Arrows)
    useEffect(() => {
        if (!map) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if in input/textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            const isShift = e.shiftKey;
            const moveStepMap = 0.0001; // Map panning (~10m)
            const moveStepAnchor = 0.1; // Anchor movement (10cm)
            const zoomStep = 0.2;
            const rotateStep = 5; // Degrees

            const center = map.getCenter();
            const zoom = map.getZoom();
            const bearing = map.getBearing();
            const pitch = map.getPitch();

            // If Shift is pressed, we might be moving the anchor
            if (isShift && selectedPlacemark && canUpdate) {
                const docId = (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id;
                const compositeId = `${docId}:::${selectedPlacemark.id}`;
                const override = placemarkOverrides[compositeId];

                const currentModelUrl = override?.customModelUrl || cableSettings?.customModelUrl || LOCAL_MODEL_URL;
                const currentTransform = override?.customModelTransform || getModelConfig(currentModelUrl) || { scale: [1, 1, 1], rotation: [0, 0, 0], offset: [0, 0, 0], baseHeight: 1 };

                const newTransform: ModelTransform = { ...currentTransform };
                const currentGlobalOffset = currentTransform.anchorGlobalOffset || { x: 0, y: 0, z: 0 };
                const phaseOverride = pickingPhaseId ? currentTransform.phaseOverrides?.[pickingPhaseId] : null;
                const individualOffset = pickingAnchorId ? currentTransform.anchorOverrides?.[pickingAnchorId] : null;

                let dx = 0;
                let dy = 0;

                switch (e.code) {
                    case 'KeyW':
                    case 'ArrowUp':
                        dy = moveStepAnchor;
                        break;
                    case 'KeyS':
                    case 'ArrowDown':
                        dy = -moveStepAnchor;
                        break;
                    case 'KeyA':
                    case 'ArrowLeft':
                        dx = -moveStepAnchor;
                        break;
                    case 'KeyD':
                    case 'ArrowRight':
                        dx = moveStepAnchor;
                        break;
                    default:
                        return; // Don't handle other keys here
                }

                e.preventDefault();

                if (pickingPhaseId) {
                    newTransform.phaseOverrides = {
                        ...(currentTransform.phaseOverrides || {}),
                        [pickingPhaseId]: {
                            x: (phaseOverride?.x ?? currentGlobalOffset.x) + dx,
                            y: (phaseOverride?.y ?? currentGlobalOffset.y) + dy,
                            z: (phaseOverride?.z ?? currentGlobalOffset.z)
                        }
                    };
                } else if (pickingAnchorId) {
                    newTransform.anchorOverrides = {
                        ...(currentTransform.anchorOverrides || {}),
                        [pickingAnchorId]: {
                            x: (individualOffset?.x ?? currentGlobalOffset.x) + dx,
                            y: (individualOffset?.y ?? currentGlobalOffset.y) + dy,
                            z: (individualOffset?.z ?? currentGlobalOffset.z)
                        }
                    };
                } else {
                    newTransform.anchorGlobalOffset = {
                        x: currentGlobalOffset.x + dx,
                        y: currentGlobalOffset.y + dy,
                        z: currentGlobalOffset.z
                    };
                }

                if (onUpdatePlacemarkTransform && docId) {
                    onUpdatePlacemarkTransform(docId, selectedElement.id, newTransform);
                }
                return;
            }

            // Standard Map Navigation (No Shift or No Selection)
            switch (e.code) {
                // Panning
                case 'KeyW':
                case 'ArrowUp':
                    e.preventDefault();
                    map.easeTo({ center: [center.lng, center.lat + moveStepMap], duration: 100 });
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    e.preventDefault();
                    map.easeTo({ center: [center.lng, center.lat - moveStepMap], duration: 100 });
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    e.preventDefault();
                    map.easeTo({ center: [center.lng - moveStepMap, center.lat], duration: 100 });
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    e.preventDefault();
                    map.easeTo({ center: [center.lng + moveStepMap, center.lat], duration: 100 });
                    break;

                // Zooming (Q / E)
                case 'KeyQ':
                    e.preventDefault();
                    map.easeTo({ zoom: zoom - zoomStep, duration: 100 });
                    break;
                case 'KeyE':
                    e.preventDefault();
                    map.easeTo({ zoom: zoom + zoomStep, duration: 100 });
                    break;

                // Rotation (R / F)
                case 'KeyR':
                    e.preventDefault();
                    map.easeTo({ bearing: bearing - rotateStep, duration: 100 });
                    break;
                case 'KeyF':
                    e.preventDefault();
                    map.easeTo({ bearing: bearing + rotateStep, duration: 100 });
                    break;

                // Pitch (Z / X)
                case 'KeyZ':
                    e.preventDefault();
                    map.easeTo({ pitch: Math.max(0, pitch - 5), duration: 100 });
                    break;
                case 'KeyX':
                    e.preventDefault();
                    map.easeTo({ pitch: Math.min(85, pitch + 5), duration: 100 });
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [map, selectedElement, placemarkOverrides, pickingAnchorId, pickingPhaseId, canUpdate, cableSettings]);

    // GeoJSON for Mapbox Model Layer - Using TowerLayerService

    // GeoJSON for 3D Bounding Boxes around towers
    const towerBoundingBoxesGeoJSON = useMemo(() => {
        const BOX_SIZE = 0.00000; // ~25 meters

        return {
            type: 'FeatureCollection',
            features: towersWithTerrain.filter(p => p.isLocal).map(p => {
                const docId = (p as any).document_id || '';
                const compositeId = `${docId}:::${p.id}`;
                const override = placemarkOverrides[compositeId];
                const towerHeight = override?.height ?? p.towerHeight ?? 30;
                const lng = p.coordinates.lng;
                const lat = p.coordinates.lat;

                // Rotation logic
                const rotation = override?.angle !== undefined
                    ? override.angle
                    : (towerAlignments.get(p.id) ?? (p as any).calculatedHeading ?? (p as any).heading ?? (p as any).rotation ?? 0);
                const rad = -rotation * (Math.PI / 180); // Negate for Clockwise
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const rotatePoint = (px: number, py: number) => {
                    const dx = px - lng;
                    const dy = py - lat;
                    // Rotate
                    const rx = dx * cos - dy * sin;
                    const ry = dx * sin + dy * cos;
                    return [lng + rx, lat + ry];
                };

                // Create a square polygon around the tower WITH Z coordinates for 3D elevation
                const halfSize = BOX_SIZE / 2;
                const z = towerHeight; // Z = tower height for elevated outline

                // Base coordinates (unrotated) relative to center
                const p1 = rotatePoint(lng - halfSize, lat - halfSize);
                const p2 = rotatePoint(lng + halfSize, lat - halfSize);
                const p3 = rotatePoint(lng + halfSize, lat + halfSize);
                const p4 = rotatePoint(lng - halfSize, lat + halfSize);

                const polygon = [
                    [p1[0], p1[1], z],
                    [p2[0], p2[1], z],
                    [p3[0], p3[1], z],
                    [p4[0], p4[1], z],
                    [p1[0], p1[1], z] // Close the polygon
                ];

                return {
                    type: 'Feature',
                    properties: {
                        id: p.id,
                        name: p.name,
                        towerHeight: towerHeight,
                        heading: rotation,
                        color: override?.color || '#00ffff',
                        isSelected: selectedPlacemark?.id === p.id
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [polygon]
                    }
                };
            })
        };
    }, [towersWithTerrain, placemarkOverrides, selectedPlacemark]);

    // GeoJSON for elevated tower outlines (LineStrings with Z coordinates)
    const towerTopOutlinesGeoJSON = useMemo(() => {
        const BOX_SIZE = 0.00025; // Increased to match bounding box size

        return {
            type: 'FeatureCollection',
            features: towersWithTerrain.map(p => {
                const docId = (p as any).document_id || '';
                const compositeId = `${docId}:::${p.id}`;
                const override = placemarkOverrides[compositeId];
                const lng = p.coordinates.lng;
                const lat = p.coordinates.lat;

                // Apply global Yaw default if individual Yaw is 0
                const towerModelUrl = override?.customModelUrl || cableSettings?.customModelUrl || LOCAL_MODEL_URL;

                // ALTITUDE CONSISTENTE: Mesma lógica usada para os cabos e para o marcador
                const transform = getEffectiveTransform(override?.customModelTransform, towerModelUrl);
                const baseHeight = override?.height ?? p.towerHeight ?? 30;
                const scaleZ = (transform?.scale?.[2] ?? 1) * (transform?.baseHeight ?? 1);
                const offZ = transform?.offset?.[2] ?? 0;
                const towerHeight = (baseHeight * scaleZ) + offZ;

                const verticalOffset = cableSettings.towerVerticalOffset;
                const effectiveTopHeight = towerHeight + verticalOffset;
                const BASE_ELEV_OUTLINE = override?.elevation ?? p.elevation ?? 0;

                // Don't show outlines for procedural porticos to avoid clutter
                if (towerModelUrl === 'procedural-portico') return null;

                return {
                    type: 'Feature',
                    properties: {
                        id: p.id,
                        name: p.name,
                        towerHeight: effectiveTopHeight,
                        color: override?.color || '#00ffff',
                        elevationOffset: p.elevation - ((p as any).terrainElevation || 0)
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [lng, lat, BASE_ELEV_OUTLINE + effectiveTopHeight],
                            [lng, lat, BASE_ELEV_OUTLINE]
                        ]
                    }
                };
            }).filter(Boolean) as any
        };
    }, [chunkedTowers, placemarkOverrides, cableSettings]);

    // GeoJSON for Procedural Porticos (Pórticos)
    const proceduralPorticosGeoJSON = useMemo(() => {
        const features: any[] = [];

        towersWithTerrain.forEach(p => {
            const docId = (p as any).document_id || '';
            const compositeId = `${docId}:::${p.id}`;
            const override = placemarkOverrides[compositeId];

            // Determine if this should be rendered as a Portico
            const isTrio = /TRIO/i.test(p.name);
            const modelUrl = override?.customModelUrl || (isTrio ? 'procedural-portico' : (cableSettings?.customModelUrl || LOCAL_MODEL_URL));

            if (modelUrl !== 'procedural-portico') return;

            const transform = getEffectiveTransform(override?.customModelTransform, 'procedural-portico');
            const baseHeight = override?.height ?? p.towerHeight ?? 25;
            const scaleZ = (transform?.scale?.[2] ?? 1) * (transform?.baseHeight ?? 1);
            const offZ = transform?.offset?.[2] ?? 0;
            const towerHeight = (baseHeight * scaleZ) + offZ;

            const lng = p.coordinates.lng;
            const lat = p.coordinates.lat;

            // Follow Angle defined in Card (override.angle) or calculated
            const baseRot = (p as any).calculatedHeading || (p as any).heading || (p as any).rotation || 0;
            const yawOverride = transform?.rotation?.[2] ?? 0;
            const rotation = (override?.angle !== undefined ? override.angle : baseRot) + yawOverride;
            const headingRad = -(rotation) * (Math.PI / 180);

            // Portico Dimensions
            const SPAN_WIDTH = 14; // meters (total span)
            const COLUMN_SIZE = 1.2; // meters (square)
            const BEAM_HEIGHT = 1.5; // meters (thickness of top beam)
            const BASE_ELEVATION_ABS = override?.elevation ?? p.elevation ?? p.coordinates.altitude ?? 0;
            const TERRAIN_ELEV = (p as any).terrainElevation || 0;
            const BASE_REL = BASE_ELEVATION_ABS - TERRAIN_ELEV;

            const verticalOffset = cableSettings.towerVerticalOffset;
            const effectiveTopHeight = towerHeight + verticalOffset;

            // Helper to offset point in meters
            const offsetPoint = (xOffset: number, yOffset: number) => {
                // Approximate meters to degrees conversion
                const M_PER_DEG_LAT = 111132.92;
                const M_PER_DEG_LON = 111412.84 * Math.cos(lat * Math.PI / 180);

                // Rotate offset
                const rx = xOffset * Math.cos(headingRad) - yOffset * Math.sin(headingRad);
                const ry = xOffset * Math.sin(headingRad) + yOffset * Math.cos(headingRad);

                return [
                    lng + (rx / M_PER_DEG_LON),
                    lat + (ry / M_PER_DEG_LAT)
                ];
            };

            // Helper to ensure ring closure
            const closePoly = (coords: number[][]) => [...coords, coords[0]];

            // Determine active texture (default to metal-light for columns)
            const mainTexture = override?.texture || cableSettings?.customTexture || 'texture-metal-light';

            // Derive secondary textures unless overridden specifically (future proofing), 
            // for now just use logical defaults or valid variations if main texture changes type
            let beamTexture = 'texture-metal-medium';
            const foundationTexture = 'texture-concrete-dark';

            // If main texture is Rust/Wood/Warning, apply to beam too for consistency
            if (mainTexture.includes('rust') || mainTexture.includes('wood') || mainTexture.includes('warning')) {
                beamTexture = mainTexture;
            }

            // 1. Left Column
            const leftColCenter = -SPAN_WIDTH / 2;
            const p1L = offsetPoint(leftColCenter - COLUMN_SIZE / 2, -COLUMN_SIZE / 2);
            const p2L = offsetPoint(leftColCenter + COLUMN_SIZE / 2, -COLUMN_SIZE / 2);
            const p3L = offsetPoint(leftColCenter + COLUMN_SIZE / 2, COLUMN_SIZE / 2);
            const p4L = offsetPoint(leftColCenter - COLUMN_SIZE / 2, COLUMN_SIZE / 2);

            features.push({
                type: 'Feature',
                properties: {
                    id: `${p.id}-col-left`,
                    color: '#d4d4d8', // zinc-300
                    texture: mainTexture,
                    height: BASE_REL + effectiveTopHeight,
                    base_height: BASE_REL,
                    type: 'column'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [closePoly([p1L, p2L, p3L, p4L])]
                }
            });

            // 2. Right Column
            const rightColCenter = SPAN_WIDTH / 2;
            const p1R = offsetPoint(rightColCenter - COLUMN_SIZE / 2, -COLUMN_SIZE / 2);
            const p2R = offsetPoint(rightColCenter + COLUMN_SIZE / 2, -COLUMN_SIZE / 2);
            const p3R = offsetPoint(rightColCenter + COLUMN_SIZE / 2, COLUMN_SIZE / 2);
            const p4R = offsetPoint(rightColCenter - COLUMN_SIZE / 2, COLUMN_SIZE / 2);

            features.push({
                type: 'Feature',
                properties: {
                    id: `${p.id}-col-right`,
                    color: '#d4d4d8', // zinc-300
                    texture: mainTexture,
                    height: BASE_REL + effectiveTopHeight,
                    base_height: BASE_REL,
                    type: 'column'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [closePoly([p1R, p2R, p3R, p4R])]
                }
            });

            // 3. Top Beam (Crossarm)
            // Beam extends slightly past columns
            const beamOverhang = 1.5;
            const beamHalfLength = (SPAN_WIDTH / 2) + beamOverhang;
            const beamWidth = COLUMN_SIZE * 0.8;

            const b1 = offsetPoint(-beamHalfLength, -beamWidth / 2);
            const b2 = offsetPoint(beamHalfLength, -beamWidth / 2);
            const b3 = offsetPoint(beamHalfLength, beamWidth / 2);
            const b4 = offsetPoint(-beamHalfLength, beamWidth / 2);

            features.push({
                type: 'Feature',
                properties: {
                    id: `${p.id}-beam`,
                    color: '#a1a1aa', // zinc-400 (slightly darker)
                    texture: beamTexture,
                    height: BASE_REL + effectiveTopHeight,
                    base_height: BASE_REL + effectiveTopHeight - BEAM_HEIGHT,
                    type: 'beam'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [closePoly([b1, b2, b3, b4])]
                }
            });

            // 4. Foundations (Concrete bases) - Visual polish
            const fSize = COLUMN_SIZE * 1.6;
            const fHeight = 0.5;

            const f1L = offsetPoint(leftColCenter - fSize / 2, -fSize / 2);
            const f2L = offsetPoint(leftColCenter + fSize / 2, -fSize / 2);
            const f3L = offsetPoint(leftColCenter + fSize / 2, fSize / 2);
            const f4L = offsetPoint(leftColCenter - fSize / 2, fSize / 2);

            features.push({
                type: 'Feature',
                properties: {
                    id: `${p.id}-found-left`,
                    color: '#52525b', // zinc-600 (concrete dark)
                    texture: foundationTexture,
                    height: BASE_REL + fHeight,
                    base_height: BASE_REL,
                    type: 'foundation'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [closePoly([f1L, f2L, f3L, f4L])]
                }
            });

            const f1R = offsetPoint(rightColCenter - fSize / 2, -fSize / 2);
            const f2R = offsetPoint(rightColCenter + fSize / 2, -fSize / 2);
            const f3R = offsetPoint(rightColCenter + fSize / 2, fSize / 2);
            const f4R = offsetPoint(rightColCenter - fSize / 2, fSize / 2);

            features.push({
                type: 'Feature',
                properties: {
                    id: `${p.id}-found-right`,
                    color: '#52525b', // zinc-600
                    texture: foundationTexture,
                    height: BASE_REL + fHeight,
                    base_height: BASE_REL,
                    type: 'foundation'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [closePoly([f1R, f2R, f3R, f4R])]
                }
            });

        });

        return {
            type: 'FeatureCollection',
            features
        };
    }, [chunkedTowers, placemarkOverrides, cableSettings]);
    // -------------------------------------------------------------------------
    // 3D Cable Generation (Using Deck.gl for ABSOLUTE elevation - No Undulation)
    // -------------------------------------------------------------------------
    const deckGLLayers = useMemo(() => {
        if (!show3D) return [];

        const getLocKey = (t: KMLPlacemark) => {
            const name = (t.name || '').toUpperCase().trim();
            const baseMatch = name.match(/^(\d+[/-]\d+)/);
            if (baseMatch) return baseMatch[1];
            return `${t.coordinates.lng.toFixed(3)},${t.coordinates.lat.toFixed(3)}`;
        };

        const getNumericId = (p: KMLPlacemark) => {
            const name = p.name || '';
            const m = name.match(/(\d+)/);
            return m ? parseInt(m[1]) : 0;
        };

        // 1. Generate Cables
        const paths = CableLayerService.generateCables({
            towers: towersWithTerrain, // Cabos precisam da lista completa para continuidade entre chunks (ou vizinhos)
            projectSpans,
            cableSettings,
            placemarkOverrides,
            hiddenSpans,
            hiddenPlacemarkIds,
            projectId,
            projectAnchors,
            templateAnchors,
            getNumericId,
            getLocKey,
            localModelUrl: LOCAL_MODEL_URL,
            getEffectiveTransform,
            disableAutoGeneration: !isAutoConnecting // Auto-connect disabled unless explicitly active
        });

        // Filtrar caminhos visíveis (Otimização Deck.gl)
        const visiblePaths = paths.filter(p => {
            if (!viewportBounds) return true;
            // Simplificação: verifica se as torres conectadas estão no chunk (ou próximas)
            const src = towersWithTerrain.find(t => t.id === p.towerStartId);
            const tgt = towersWithTerrain.find(t => t.id === p.towerEndId);
            if (!src || !tgt) return false;

            const LAT_BUF = 0.01;
            const LNG_BUF = 0.01;
            const w = viewportBounds.getWest() - LNG_BUF;
            const e = viewportBounds.getEast() + LNG_BUF;
            const s = viewportBounds.getSouth() - LAT_BUF;
            const n = viewportBounds.getNorth() + LAT_BUF;

            const isPointVisible = (lng: number, lat: number) => lng >= w && lng <= e && lat >= s && lat <= n;
            return isPointVisible(src.coordinates.lng, src.coordinates.lat) ||
                isPointVisible(tgt.coordinates.lng, tgt.coordinates.lat);
        });

        // 2. Selection Effect Logic
        const selectedPath = selectedPlacemark && (selectedPlacemark.extendedData as any)?.source === '3d_cable_virtual_layer' 
            ? visiblePaths.filter(p => p.id === selectedPlacemark.id)
            : [];

        const cableLayer = new PathLayer({
            id: 'deck-cables-layer',
            data: visiblePaths,
            pickable: true,
            getPath: (d: Record<string, unknown>) => d.path as [number, number, number][],
            getColor: (d: any) => {
                const isSelected = selectedPlacemark?.id === d.id;
                const hexValue = (typeof d.color === 'string' ? d.color : '#cbd5e1').replace('#', '');
                const r = parseInt(hexValue.substring(0, 2), 16) || 203;
                const g = parseInt(hexValue.substring(2, 4), 16) || 213;
                const b = parseInt(hexValue.substring(4, 6), 16) || 225;
                
                if (isSelected) return [0, 255, 255, 255]; // Ciano para seleção
                return [r, g, b, 255];
            },
            getWidth: (d: any) => {
                const isSelected = selectedPlacemark?.id === d.id;
                return isSelected ? (d.width || 3) * 2 : (d.width || 3);
            },
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            opacity: cableSettings.globalOpacity,
            parameters: { depthTest: true },
            updateTriggers: {
                getPath: [visiblePaths.length, cableSettings.towerVerticalOffset, terrainRevision],
                getColor: [selectedPlacemark?.id],
                getWidth: [selectedPlacemark?.id]
            },
            onClick: (info: any) => {
                if (info.object) {
                    console.log('Clicked Cable:', info.object);
                    if (onSelectPlacemark) {
                        onSelectPlacemark({
                            id: info.object.id,
                            name: `Vão ${info.object.towerStartName} ↔ ${info.object.towerEndName}`,
                            coordinates: { lat: 0, lng: 0 },
                            extendedData: {
                                ...info.object,
                                source: '3d_cable_virtual_layer'
                            }
                        } as any);
                    }
                }
                return true;
            }
        });

        // Selection Glow Layer (Cyan)
        const selectionGlowLayer = new PathLayer({
            id: 'deck-cables-selection-glow',
            data: selectedPath,
            pickable: false,
            getPath: (d: any) => d.path,
            getColor: () => [0, 255, 255, 150],
            getWidth: () => 12,
            widthUnits: 'pixels',
            opacity: 0.6,
            parameters: { depthTest: true }
        });

        // Specular Highlight Layer (The "Shine" on the metal)
        const cableShineLayer = new PathLayer({
            id: 'deck-cables-shine-layer',
            data: visiblePaths,
            pickable: false, // Don't pick on the highlight
            getPath: (d: Record<string, unknown>) => d.path as [number, number, number][],
            getColor: () => [255, 255, 255, 180] as [number, number, number, number], // Bright white highlight
            getWidth: (d: Record<string, unknown>) => Math.max(1, (Number(d.width) || 3) * 0.4), // 40% of original width
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            opacity: cableSettings.globalOpacity * 0.8,
            parameters: { 
                depthTest: true,
                blendColor: [1, 1, 1, 0.5]
            },
            updateTriggers: {
                getPath: [visiblePaths.length, cableSettings.towerVerticalOffset, terrainRevision]
            }
        });

        // 2. Generate Towers (Deck.gl Scenegraph)
        const towerLayers = TowerScenegraphService.getLayers(chunkedTowers, {
            towerVerticalOffset: cableSettings.towerVerticalOffset,
            terrainRevision,
            getTerrainElevation: (lng, lat) => map?.queryTerrainElevation([lng, lat]) ?? 0,
            cableSettings,
            localModelUrl: LOCAL_MODEL_URL,
            projectAnchors,
            templateAnchors
        }, towerAlignments);

        // 3. Generate Anchor Debug Points (Optional)
        /*
        const anchorLayers = AnchorDebugService.getLayers({
            towers: towersWithTerrain,
            cableSettings,
            placemarkOverrides,
            projectAnchors,
            templateAnchors,
            localModelUrl: LOCAL_MODEL_URL,
            getEffectiveTransform,
            terrainRevision,
            getTerrainElevation: (lng, lat) => map?.queryTerrainElevation([lng, lat]) ?? 0,
            onAnchorClick: (towerId, anchorId) => {
                // DISABLED (User Request): Repositioning via click is temporarily disabled
                
                const tower = towersWithTerrain.find(t => t.id === towerId);
                const anchorConfig = cableSettings.anchors.find(a => a.id === anchorId);
                const phaseId = anchorConfig?.phase;
    
                if (tower) {
                    console.log('--- Anchor Debug Click ---');
                    console.log('Tower:', tower.id, tower.name);
                    console.log('Anchor Config ID:', anchorId);
                    console.log('Phase ID:', phaseId);
                    console.log('Color:', anchorConfig?.color);
    
    
                    onSelectPlacemark?.(tower);
                    setIsPickingAnchorPosition(true);
                    setPickingAnchorTowerId(towerId);
                    setPickingAnchorId(anchorId);
                    setPickingPhaseId(phaseId || null);
    
                    const objName = (tower as any).object_id || (tower as any).objectId || tower.name;
                    const phaseColor = anchorConfig?.color || '#ffffff';
    
                    toast({
                        title: "Ajuste de Fixação",
                        description: `Clique no mapa para mover o ponto de fixação ${phaseId || 'desconhecido'}`,
                        className: "border-l-4",
                        style: { borderLeftColor: phaseColor }
                    });
                }
                
                return true;
            }
        });
        */
        const anchorLayers: any[] = [];
        return [cableLayer, selectionGlowLayer, cableShineLayer, ...towerLayers, ...anchorLayers];
    }, [towersWithTerrain, projectSpans, show3D, cableSettings, placemarkOverrides, hiddenSpans, hiddenPlacemarkIds, projectId, canUpdate, terrainRevision, map, towerAlignments, selectedPlacemark, onSelectPlacemark, isAutoConnecting, chunkedTowers]);

    // GeoJSON for Solid 3D Cables (fill-extrusion)
    const solidCablesGeoJSON = useMemo(() => {
        if (!show3D) return { type: 'FeatureCollection', features: [] };
        const features: any[] = [];
        return { type: 'FeatureCollection', features };
    }, [show3D]);




    // 3D Cable interaction logic can be added here if needed for Deck.gl PathLayer.

    return (
        <>
            {/* 3D Bounding Boxes and Outlines hidden as requested */}

            {/* 3D Bounding Boxes and Outlines hidden as requested */}
            {/* 
            <Source id="tower-bounding-boxes" type="geojson" data={towerBoundingBoxesGeoJSON as any}>
                ...
            </Source>
            */}

            {/* 3D Vertical Tower Grounding Lines (Ensures tower connectivity even if model fails) */}
            <Source id="tower-vertical-lines" type="geojson" data={towerTopOutlinesGeoJSON as any}>
                <Layer
                    id="tower-vertical-lines-layer"
                    type="line"
                    paint={{
                        'line-color': ['get', 'color'],
                        'line-width': 2,
                        'line-opacity': 0.6,
                        'line-dasharray': [2, 1]
                    }}
                />
            </Source>

            {/* 3D Cable Segments (Thickness/Occlusion) */}



            {/* Deck.gl Overlay for Absolute 3D Objects */}
            {show3D && <DeckGLOverlay layers={deckGLLayers} interleaved={true} />}

            {/* Native 3D Labels removed to avoid duplication - Only keeping yellow KMZ label as requested */}


            {/* Solid 3D Cables (fill-extrusion) */}
            {/* Solid 3D Cables removed to fix white bar artifact */}
            {/* 
            <Source id="solid-cables-source" type="geojson" data={solidCablesGeoJSON as any}>
               ...
            </Source>
            */}



            {/* Procedural Portico Layer */}
            <Source id="procedural-portico-source" type="geojson" data={proceduralPorticosGeoJSON as any}>
                <Layer
                    id="procedural-portico-layer"
                    type="fill-extrusion"
                    paint={{
                        'fill-extrusion-pattern': ['get', 'texture'],
                        'fill-extrusion-color': ['get', 'color'],
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'base_height'],
                        'fill-extrusion-opacity': 1
                    }}
                />
            </Source>

            {isZoomedIn && chunkedTowers.map((p) => {
                // Use the document_id stored in the enriched placemark
                const docId = (p as any).document_id || '';
                if (hiddenPlacemarkIds.has(`${docId}:::${p.id}`)) return null;

                // Get individual overrides for precise 3D placement
                const override = placemarkOverrides[`${docId}:::${p.id}`];
                // Apply global Yaw default if individual Yaw is 0
                const towerModelUrl = override?.customModelUrl || cableSettings?.customModelUrl || LOCAL_MODEL_URL;
                const transform = getEffectiveTransform(override?.customModelTransform, towerModelUrl);
                const scaleZ = (transform?.scale?.[2] ?? 1) * (transform?.baseHeight ?? 1);
                const offZ = transform?.offset?.[2] ?? 0;
                const towerHeight = (p as any).towerHeight || 30;

                // FIX: Altitude set to base to stay on ground (soil) as requested
                const effectiveAltitude = (p as any).elevation + offZ + cableSettings.towerVerticalOffset;

                return (
                    <React.Fragment key={`3d-marker-group-${docId}:::${p.id}`}>
                        {/* Interactive Tower Label Marker - BASE FIXADA AUTOMÁTICA (SNAP TO TERRAIN) */}
                        <Marker
                            key={`3d-marker-${docId}:::${p.id}`}
                            longitude={p.coordinates.lng}
                            latitude={p.coordinates.lat}
                            // altitude removido para snap automático ao terreno
                            anchor="bottom"
                            offset={[0, 0]}
                            clickTolerance={0}
                            draggable={true}
                        >
                            <div
                                className="group relative flex flex-col items-center select-none"
                                style={{
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    cursor: 'default'
                                }}
                                onMouseEnter={() => setHoveredMarker(`${docId}:::${p.id}`)}
                                onMouseLeave={() => setHoveredMarker(null)}
                            >
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        if (isConnectingMode && firstTowerToConnect) {
                                            if (firstTowerToConnect.id === p.id) {
                                                toast({
                                                    title: "Conexão Inválida",
                                                    description: "Selecione uma torre diferente para conectar.",
                                                    variant: "destructive"
                                                });
                                                return;
                                            }
                                            handleConnectTowers(p);
                                            return;
                                        }

                                        onSelectPlacemark?.(p);
                                    }}
                                    onMouseDown={(e) => {
                                        // CRITICAL: Stop propagation to prevent map dragging when interacting with towers
                                        e.stopPropagation();
                                    }}
                                    className="relative flex flex-col items-center transition-all duration-300 hover:scale-110 active:scale-95"
                                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                >
                                    {/* Visual Indicator (Glow Effect) */}
                                    <div
                                        className={cn(
                                            "w-8 h-8 backdrop-blur-md rounded-xl border-2 flex items-center justify-center shadow-2xl transition-all duration-500",
                                            selectedPlacemark?.id === p.id
                                                ? "ring-4 ring-primary/60 scale-125 border-white shadow-[0_0_30px_rgba(var(--primary),0.8)] bg-primary/20"
                                                : "border-white/40 hover:border-white shadow-[0_4px_15px_rgba(0,0,0,0.5)] bg-black/20"
                                        )}
                                        style={{
                                            borderColor: (() => {
                                                const ov = placemarkOverrides[`${docId}:::${p.id}`];
                                                return ov?.color || (p.isLocal ? '#10b981' : '#3b82f6');
                                            })()
                                        }}
                                    >
                                        {p.isLocal ? (
                                            <Tower
                                                className={cn("w-5 h-5 transition-all text-white drop-shadow-md")}
                                                style={{
                                                    color: (placemarkOverrides[`${docId}:::${p.id}`]?.color || '#10b981')
                                                }}
                                            />
                                        ) : (
                                            <Box
                                                className={cn("w-5 h-5 transition-all text-white drop-shadow-md")}
                                                style={{
                                                    color: (placemarkOverrides[`${docId}:::${p.id}`]?.color || '#3b82f6')
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Tower Name Label - RESTAURADO */}
                                    <div className="absolute top-full mt-1.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-md border border-white/10 shadow-xl transition-all group-hover:scale-110">
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5">
                                            {p.towerName}
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </Marker>

                        {/* Tooltip Label removed to avoid redundancy - Only the yellow baseline label is kept */}

                        {/* Selection Ring (Animated) */}
                        {
                            selectedPlacemark?.id === p.id && (
                                <div className="absolute -inset-4 border-2 border-primary/30 rounded-full animate-ping pointer-events-none" />
                            )
                        }
                    </React.Fragment >
                );
            }) /* Fim do map */}
            { /* Fim do isZoomedIn */}



            {selectedElement && (
                <div className="fixed top-24 right-6 bottom-6 z-50 w-[320px] animate-in slide-in-from-right duration-500 pointer-events-none">
                    <div className="flex flex-col h-full bg-background/80 backdrop-blur-3xl border border-white/5 rounded-4xl overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,1)] pointer-events-auto">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="bg-primary/10 border-b border-white/5 p-4 relative overflow-hidden group">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                                    <span className="text-[6.5px] font-black uppercase tracking-[0.2em] text-primary/80">
                                        {(selectedPlacemark.extendedData as any)?.source === '3d_cable_virtual_layer' ? 'VÃO DE CABO' : 'ESPECIFICAÇÕES TÉCNICAS'}
                                    </span>
                                </div>

                                <h3 className="text-base font-black text-white tracking-tight uppercase leading-none drop-shadow-md flex items-baseline gap-1">
                                    {(selectedPlacemark.extendedData as any)?.object_id || (selectedPlacemark.extendedData as any)?.objectId || selectedPlacemark.name}
                                    <span className="text-primary/40 text-[8px] font-light">/</span>
                                    <span className="text-primary text-[8px] tracking-wider italic truncate max-w-[120px]">
                                        {(selectedPlacemark.extendedData as any)?.is_auto
                                            ? 'AUTO'
                                            : ((selectedPlacemark as any).towerType || (selectedPlacemark.extendedData as any)?.tower_type || (selectedPlacemark.extendedData as any)?.tipo || (selectedPlacemark.extendedData as any)?.type || (selectedPlacemark.extendedData as any)?.towerType || ((selectedPlacemark.extendedData as any)?.source === '3d_cable_virtual_layer' ? 'CIRCUITO' : 'ESTRUTURA'))}
                                    </span>
                                </h3>

                                <button
                                    onClick={() => onSelectPlacemark?.(null)}
                                    className="absolute top-2.5 right-2.5 p-1 hover:bg-white/10 rounded-full transition-colors z-20 group/close"
                                >
                                    <X className="w-3 h-3 text-white opacity-40 group-hover/close:opacity-100 transition-opacity" />
                                </button>

                                <div className="absolute top-0 -right-4 opacity-[0.03] pointer-events-none">
                                    {(selectedPlacemark.extendedData as any)?.source === '3d_cable_virtual_layer' ? (
                                        <Box className="w-16 h-16 rotate-12" />
                                    ) : (
                                        <Tower className="w-16 h-16 rotate-12" />
                                    )}
                                </div>
                            </div>

                            <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex gap-2 items-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        let docId = (selectedPlacemark as any).document_id ||
                                            (selectedPlacemark as any).projectId ||
                                            (selectedPlacemark as any).project_id ||
                                            (selectedPlacemark.extendedData as any)?.document_id;

                                        if (!docId) {
                                            const parentDoc = kmlDocuments.find(doc =>
                                                doc.placemarks.some(p => p.id === selectedPlacemark.id)
                                            );
                                            docId = parentDoc?.id;
                                        }

                                        if (docId) {
                                            onHidePlacemark?.(docId, selectedPlacemark as KMLPlacemark);
                                            onSelectPlacemark?.(null);
                                        }
                                    }}
                                    className="h-8 px-3 glass-card border-red-500/20 hover:bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest gap-2"
                                >
                                    <X className="w-3 h-3" />
                                    Ocultar
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const docId = (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id;
                                        const compositeId = `${docId}:::${selectedPlacemark.id}`;
                                        const override = placemarkOverrides[compositeId];
                                        const currentModelUrl = override?.customModelUrl || cableSettings?.customModelUrl || LOCAL_MODEL_URL;
                                        const currentTransform = override?.customModelTransform || getModelConfig(currentModelUrl) || { scale: [1, 1, 1], rotation: [0, 0, 0], offset: [0, 0, 0], baseHeight: 1 };

                                        onUpdatePlacemarkTransform?.(docId, selectedPlacemark.id, {
                                            ...currentTransform,
                                            anchorGlobalOffset: undefined,
                                            anchorOverrides: undefined,
                                            phaseOverrides: undefined
                                        });
                                        toast({ title: "Resetado", description: "Ajustes removidos." });
                                    }}
                                    className="h-8 px-3 border border-orange-500/20 hover:bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Reverter
                                </Button>

                                <div className="relative ml-auto">
                                    <button
                                        onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                        className="w-7 h-7 rounded-md border-2 border-white/30"
                                        style={{
                                            backgroundColor: (() => {
                                                const docId = (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id;
                                                const override = placemarkOverrides[`${docId}:::${selectedPlacemark.id}`];
                                                return override?.color || '#22c55e';
                                            })()
                                        }}
                                    />
                                    {isColorPickerOpen && (
                                        <div className="absolute right-0 bottom-full mb-3 z-50 p-3 bg-black/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl w-48">
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {PRESET_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => {
                                                            const docId = (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id;
                                                            if (docId) onUpdatePlacemarkColor?.(docId, selectedPlacemark.id, color);
                                                            setIsColorPickerOpen(false);
                                                        }}
                                                        className="w-6 h-6 rounded-md"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-center group/card hover:bg-primary/5 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setEditingHeightValue(((selectedPlacemark as any).towerHeight || (selectedPlacemark.extendedData as any)?.height || '30').toString());
                                            setEditingHeightElement({ docId: (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id, elementId: selectedPlacemark.id });
                                            setIsHeightDialogOpen(true);
                                        }}
                                    >
                                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest mb-1 group-hover/card:text-primary transition-colors">Altura</span>
                                        <span className="text-xs font-black text-white antialiased">
                                            {placemarkOverrides[`${(selectedPlacemark as any).document_id}:::${selectedPlacemark.id}`]?.height || (selectedPlacemark as any).towerHeight || '30'}m
                                        </span>
                                    </div>

                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-center group/card hover:bg-primary/5 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setEditingAngleValue(((selectedPlacemark.extendedData as any)?.angle || '0').toString());
                                            setEditingAngleElement({ docId: (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id, elementId: selectedPlacemark.id });
                                            setIsAngleDialogOpen(true);
                                        }}
                                    >
                                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest mb-1 group-hover/card:text-primary transition-colors">Ângulo</span>
                                        <span className="text-xs font-black text-white antialiased">
                                            {(placemarkOverrides[`${(selectedPlacemark as any).document_id}:::${selectedPlacemark.id}`]?.angle
                                                ?? (selectedPlacemark.extendedData as any)?.angle
                                                ?? 0).toFixed(1)}°
                                        </span>
                                    </div>

                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-center group/card hover:bg-primary/5 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setEditingElevationValue(((selectedPlacemark as any).elevation || '0').toString());
                                            setEditingElevationElement({ docId: (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id, elementId: selectedPlacemark.id });
                                            setIsElevationDialogOpen(true);
                                        }}
                                    >
                                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest mb-1 group-hover/card:text-primary transition-colors">Cota</span>
                                        <span className="text-xs font-black text-white antialiased">
                                            {(placemarkOverrides[`${(selectedPlacemark as any).document_id}:::${selectedPlacemark.id}`]?.elevation
                                                ?? (selectedPlacemark as any).elevation
                                                ?? 0).toFixed(1)}m
                                        </span>
                                    </div>
                                </div>

                                {canUpdate && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (isConnectingMode) {
                                                            setIsConnectingMode(false);
                                                            setFirstTowerToConnect(null);
                                                        } else {
                                                            setIsConnectingMode(true);
                                                            setFirstTowerToConnect(selectedElement as KMLPlacemark);
                                                            toast({
                                                                title: "Link Mode",
                                                                description: "Selecione a próxima estrutura."
                                                            });
                                                        }
                                                    }}
                                                    className={cn(
                                                        "h-9 text-[9px] uppercase font-black rounded-xl transition-all shadow-lg active:scale-95",
                                                        isConnectingMode ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-primary/5 border-primary/20 text-primary"
                                                    )}
                                                >
                                                    <Cable className="w-3.5 h-3.5 mr-1.5" />
                                                    {isConnectingMode ? 'Cancelar' : 'Link'}
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleAutoConnectAll}
                                                    disabled={isAutoConnecting || !projectId || projectId === 'all'}
                                                    className="h-9 text-[9px] uppercase font-black rounded-xl bg-amber-500/5 border-amber-500/20 text-amber-500"
                                                >
                                                    <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isAutoConnecting && "animate-spin")} />
                                                    Auto
                                                </Button>
                                            </div>

                                            <Select
                                                value={(() => {
                                                    const docId = (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id;
                                                    const compositeId = `${docId}:::${selectedPlacemark.id}`;
                                                    const override = placemarkOverrides[compositeId];
                                                    return override?.customModelUrl || cableSettings?.customModelUrl || 'default';
                                                })()}
                                                onValueChange={(val) => {
                                                    const docId = (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id;
                                                    onUpdatePlacemarkModel?.(docId, selectedPlacemark.id, val === 'default' ? '' : val);
                                                }}
                                            >
                                                <SelectTrigger className="w-full h-9 bg-black/20 border-white/5 text-[9px] font-black uppercase rounded-xl">
                                                    <div className="flex items-center gap-2">
                                                        <Maximize className="w-3 h-3 text-primary" />
                                                        <SelectValue placeholder="Modelo 3D" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                                                    <SelectItem value="default" className="text-[9px] uppercase font-black">Padrão</SelectItem>
                                                    <SelectItem value={`${window.location.origin}/models/towers/scene.gltf`} className="text-[9px] uppercase font-black">Industrial</SelectItem>
                                                    <SelectItem value="procedural-portico" className="text-[9px] uppercase font-black">Pórtico</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Move className="w-4 h-4 text-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Ajuste Fino</span>
                                                </div>
                                                {(pickingAnchorId || pickingPhaseId) && (
                                                    <button onClick={() => { setPickingAnchorId(null); setPickingPhaseId(null); }} className="text-white/40 hover:text-white transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>

                                            {['X', 'Y', 'Z'].map((axis) => {
                                                const docId = (selectedPlacemark as any).document_id || (selectedPlacemark.extendedData as any)?.document_id;
                                                const compositeId = `${docId}:::${selectedPlacemark.id}`;
                                                const override = placemarkOverrides[compositeId];
                                                const axisKey = axis.toLowerCase() as 'x' | 'y' | 'z';

                                                const currentGlobalOffset = override?.customModelTransform?.anchorGlobalOffset || { x: 0, y: 0, z: 0 };
                                                const phaseOverride = pickingPhaseId ? override?.customModelTransform?.phaseOverrides?.[pickingPhaseId] : null;
                                                const individualOffset = pickingAnchorId ? override?.customModelTransform?.anchorOverrides?.[pickingAnchorId] : null;

                                                const offsetValue = individualOffset
                                                    ? individualOffset[axisKey]
                                                    : (phaseOverride ? phaseOverride[axisKey] : currentGlobalOffset[axisKey]);

                                                const isPhaseMode = !!pickingPhaseId;
                                                const isIndividualMode = !!pickingAnchorId;
                                                const phaseColor = pickingPhaseId ? cableSettings.anchors.find(a => a.phase === pickingPhaseId)?.color : (pickingAnchorId ? cableSettings.anchors.find(a => a.id === pickingAnchorId)?.color : null);

                                                return (
                                                    <div key={axis} className="space-y-1.5">
                                                        <div className="flex justify-between text-[6px] font-black uppercase text-muted-foreground/60">
                                                            <span>Eixo {axis} {axis === 'Z' ? '(Altura)' : ''}</span>
                                                            <span className={cn(
                                                                "tabular-nums font-mono drop-shadow-sm px-1.5 py-0.5 rounded border transition-all",
                                                                isIndividualMode
                                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                    : (isPhaseMode
                                                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                                        : "bg-primary/5 text-primary border-primary/10")
                                                            )}
                                                                style={isPhaseMode || isIndividualMode ? { borderColor: phaseColor + '44', color: phaseColor, backgroundColor: phaseColor + '11' } : {}}
                                                            >
                                                                {offsetValue > 0 ? '+' : ''}{offsetValue.toFixed(2)}m
                                                            </span>
                                                        </div>
                                                        <Slider
                                                            value={[offsetValue]}
                                                            min={axis === 'Z' ? -30 : -50}
                                                            max={axis === 'Z' ? 30 : 50}
                                                            step={0.05}
                                                            onValueChange={([val]) => {
                                                                const currentModelUrl = override?.customModelUrl || cableSettings?.customModelUrl || LOCAL_MODEL_URL;
                                                                const currentTransform = override?.customModelTransform || getModelConfig(currentModelUrl) || { scale: [1, 1, 1], rotation: [0, 0, 0], offset: [0, 0, 0], baseHeight: 1 };

                                                                const newTransform: ModelTransform = {
                                                                    ...currentTransform
                                                                };

                                                                if (pickingPhaseId) {
                                                                    newTransform.phaseOverrides = {
                                                                        ...(currentTransform.phaseOverrides || {}),
                                                                        [pickingPhaseId]: {
                                                                            ...(phaseOverride || currentGlobalOffset),
                                                                            [axisKey]: val
                                                                        }
                                                                    };
                                                                } else if (pickingAnchorId) {
                                                                    newTransform.anchorOverrides = {
                                                                        ...(currentTransform.anchorOverrides || {}),
                                                                        [pickingAnchorId]: {
                                                                            ...(individualOffset || currentGlobalOffset),
                                                                            [axisKey]: val
                                                                        }
                                                                    };
                                                                } else {
                                                                    newTransform.anchorGlobalOffset = {
                                                                        ...currentGlobalOffset,
                                                                        [axisKey]: val
                                                                    };
                                                                }

                                                                onUpdatePlacemarkTransform?.(docId, selectedPlacemark.id, newTransform);
                                                            }}
                                                            className="py-1 cursor-pointer"
                                                        />
                                                    </div>
                                                );
                                            })}

                                            <p className="text-[6px] text-muted-foreground/50 italic leading-relaxed px-1">
                                                {pickingPhaseId
                                                    ? `* Editando todos os cabos da ${pickingPhaseId}.`
                                                    : (pickingAnchorId
                                                        ? `* Editando apenas a mísula ${pickingAnchorId}.`
                                                        : `* Ajuste global para todas as fases desta torre.`
                                                    )
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[6px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">UTM</span>
                                            <span className="text-[6px] font-black uppercase tracking-widest text-primary/60">FUSO {(selectedPlacemark.extendedData as any)?.fuso_object || '--'}</span>
                                        </div>
                                        <div className="bg-black/40 rounded-lg p-2.5 border border-white/5 font-mono text-[8px] flex flex-col gap-1 shadow-inner">
                                            <div className="flex justify-between items-center opacity-80">
                                                <span className="text-muted-foreground">X:</span>
                                                <span className="font-black text-white">{(selectedPlacemark.extendedData as any)?.x_coordinate || (selectedPlacemark.extendedData as any)?.x_cord_object || selectedPlacemark.coordinates.lat.toFixed(5)}</span>
                                            </div>
                                            <div className="flex justify-between items-center opacity-80">
                                                <span className="text-muted-foreground">Y:</span>
                                                <span className="font-black text-white">{(selectedPlacemark.extendedData as any)?.y_coordinate || (selectedPlacemark.extendedData as any)?.y_cord_object || selectedPlacemark.coordinates.lng.toFixed(5)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button onClick={openInGPS} className="w-full bg-linear-to-r from-primary/80 to-primary/60 hover:from-primary hover:to-primary text-white font-black text-[9px] uppercase tracking-widest gap-2 h-9 rounded-xl shadow-glow transition-all active:scale-[0.98] group/btn">
                                        <Navigation className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                        Explorar via GPS
                                    </Button>

                                    {canUpdate && (
                                        <Button
                                            onClick={() => {
                                                if (isConnectingMode) {
                                                    setIsConnectingMode(false);
                                                    setFirstTowerToConnect(null);
                                                } else {
                                                    setIsConnectingMode(true);
                                                    setFirstTowerToConnect(selectedElement as KMLPlacemark);
                                                    toast({
                                                        title: "Modo de Conexão Ativo 🔗",
                                                        description: "Agora selecione a PRÓXIMA TORRE para criar o vão.",
                                                    });
                                                }
                                            }}
                                            className={cn(
                                                "w-full font-black text-[9px] uppercase tracking-widest gap-2 h-9 rounded-xl transition-all active:scale-[0.98] group/btn",
                                                isConnectingMode
                                                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                                                    : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                                            )}
                                        >
                                            {isConnectingMode ? <X className="w-3 h-3" /> : <Cable className="w-3 h-3" />}
                                            {isConnectingMode ? 'Cancelar Conexão' : 'Conectar com Outra Torre'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AlertDialog open={isAngleDialogOpen} onOpenChange={setIsAngleDialogOpen}>
                <AlertDialogContent className="glass-card border-white/10 max-w-xl p-8">
                    <AlertDialogHeader className="mb-6">
                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <RefreshCw className="w-6 h-6 text-primary" />
                            Editar Ângulo (DMS)
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-sm uppercase tracking-widest font-bold opacity-60">
                            Fuso {(selectedPlacemark?.extendedData as any)?.fuso_object || '--'} • Formato GMS (ex: 45 30 15 S) ou Azimute decimal.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-8">
                        <Input
                            value={editingAngleValue}
                            onChange={(e) => setEditingAngleValue(e.target.value)}
                            placeholder="Ex: 47 13 12 NE"
                            className="bg-black/60 border-white/10 text-white font-mono text-3xl h-20 text-center rounded-2xl shadow-inner focus:ring-primary/20"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {

                                    /*
                                        if (!dms || dms === '0') return 0;
                                        try {
                                            // Parse simple decimal first if no formatting
                                            if (!dms.includes('°') && !dms.includes('\'')) {
                                                const num = parseFloat(dms.replace(',', '.').replace(/[^\d.-]/g, ''));
                                                return isNaN(num) ? 0 : num;
                                            }
             
                                            // Regex robusto para DMS com ou sem segundos e direção opcional (1 ou 2 letras)
                                            const parts = dms.match(/(\d+)[°|\s](\d+)['|\s]?(\d+(?:\.\d+)?)?"?\s*([NSEW]{1,2})?/i);
             
                                            if (!parts) {
                                                const normalized = dms.replace(',', '.').replace(/[^\d.-]/g, '');
                                                const num = parseFloat(normalized);
                                                return isNaN(num) ? 0 : num;
                                            }
             
                                            const degrees = parseFloat(parts[1]);
                                            const minutes = parts[2] ? parseFloat(parts[2]) : 0;
                                            const seconds = parts[3] ? parseFloat(parts[3]) : 0;
                                            const direction = parts[4]?.toUpperCase();
             
                                            let dd = degrees + (minutes / 60) + (seconds / 3600);
             
                                            // Ajuste básico de direção se necessário (embora azimute geralmente seja 0-360 direto)
                                            if (direction === 'S' || direction === 'W') {
                                                // Se for apenas S ou W, pode significar negativo ou quadrante
                                                // Assumindo comportamento anterior de inverter para S/W se for coordenada, 
                                                // mas para Heading/Ângulo de torre (0-360), isso pode não ser o desejado.
                                                // Heading geralmente é Clockwise from North.
                                                // Se o usuário digita coordenadas lat/lng, S/W é negativo.
                                                // Se é ângulo de torre... vamos manter o valor absoluto se parecer um azimute (>90 e <360).
                                                // Mas para garantir compatibilidade com o que existia:
                                                if (degrees < 90) dd = dd * -1; // Mantém lógica de inverter apenas se parecer quadrante
                                            }
             
                                            return dd;
                                        } catch (err) {
                                            console.error("Erro parsing DMS:", err);
                                            // Fallback simples
                                            const num = parseFloat(dms.replace(',', '.').replace(/[^\d.-]/g, ''));
                                            return isNaN(num) ? 0 : num;
                                        }
                                    */

                                    if (editingAngleElement) {
                                        const decimalAngle = dmsToDecimal(editingAngleValue);
                                        onUpdatePlacemarkAngle?.(editingAngleElement.docId, editingAngleElement.elementId, decimalAngle);
                                    }
                                    setIsAngleDialogOpen(false);
                                }
                            }}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="glass-card border-white/10 hover:bg-white/5">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (editingAngleElement) {
                                    const decimalAngle = dmsToDecimal(editingAngleValue);
                                    onUpdatePlacemarkAngle?.(editingAngleElement.docId, editingAngleElement.elementId, decimalAngle);
                                }
                                setIsAngleDialogOpen(false);
                            }}
                            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest"
                        >
                            Salvar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >

            <AlertDialog open={isHeightDialogOpen} onOpenChange={setIsHeightDialogOpen}>
                <AlertDialogContent className="glass-card border-white/10 max-w-xl p-8">
                    <AlertDialogHeader className="mb-6">
                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <Tower className="w-6 h-6 text-primary" />
                            Editar Altura da Estrutura
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-sm uppercase tracking-widest font-bold opacity-60">
                            Defina a altura vertical do modelo 3D em metros.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-8">
                        <Input
                            value={editingHeightValue}
                            onChange={(e) => setEditingHeightValue(e.target.value)}
                            placeholder="Ex: 30.00"
                            className="bg-black/60 border-white/10 text-white font-mono text-3xl h-20 text-center rounded-2xl shadow-inner focus:ring-primary/20"
                            autoFocus
                            type="number"
                            step="0.01"
                            min="0"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const height = parseFloat(editingHeightValue.replace(',', '.'));
                                    if (!isNaN(height) && height >= 0 && editingHeightElement) {
                                        onUpdatePlacemarkHeight?.(editingHeightElement.docId, editingHeightElement.elementId, height);
                                    }
                                    setIsHeightDialogOpen(false);
                                }
                            }}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="glass-card border-white/10 hover:bg-white/5">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                const height = parseFloat(editingHeightValue.replace(',', '.'));
                                if (!isNaN(height) && height >= 0 && editingHeightElement) {
                                    onUpdatePlacemarkHeight?.(editingHeightElement.docId, editingHeightElement.elementId, height);
                                }
                                setIsHeightDialogOpen(false);
                            }}
                            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest"
                        >
                            Salvar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Confirmação de Exclusão de Vão */}
            <AlertDialog open={isDeleteSpanDialogOpen} onOpenChange={setIsDeleteSpanDialogOpen}>
                <AlertDialogContent className="glass-card border-white/10 max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-black uppercase tracking-tight text-destructive flex items-center gap-2">
                            <X className="w-5 h-5" /> Confirmar Exclusão de Vão
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-sm">
                            Você tem certeza que deseja remover este vão e todos os seus cabos associados?<br /><br />
                            <div className="bg-black/40 p-2 rounded text-xs font-mono border border-white/5">
                                {disconnectingSpan ? `${disconnectingSpan.start} ➝ ${disconnectingSpan.end}` : 'Seleção inválida'}
                            </div>
                            <br />
                            Esta ação removerá o registro do banco de dados e recalculará as conexões.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="glass-card border-white/10 hover:bg-white/5">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                // Ensure token is up to date
                                const token = localStorage.getItem('token') || localStorage.getItem('orion_token') || localStorage.getItem('db.auth.token');
                                if (token && !orionApi.token) {
                                    console.log('🔐 Refreshing API token from storage...');
                                    orionApi.setToken(token);
                                }

                                if (disconnectingSpan) {
                                    /* Lógica de Exclusão via db/API */
                                    console.log('🗑️ Removendo Vão:', disconnectingSpan);

                                    // IMEDIATO: Ocultar visualmente para feedback instantâneo (mesmo se API falhar)
                                    // Isso atende ao pedido: "se nao der para remover, oculte!"
                                    if (disconnectingSpan.towerStartId && disconnectingSpan.towerEndId) {
                                        const n1 = normalizeName(disconnectingSpan.start);
                                        const n2 = normalizeName(disconnectingSpan.end);
                                        const keyAB = `${n1}:::${n2}`;
                                        const keyBA = `${n2}:::${n1}`;
                                        setHiddenSpans(prev => {
                                            const next = new Set(prev);
                                            next.add(keyAB);
                                            next.add(keyBA);
                                            return next;
                                        });
                                    }

                                    try {
                                        // 1. Tentar remover pelo ID do SpanTechnicalData se disponível (UUID)
                                        const technicalId = disconnectingSpan.id.split('-')[0];

                                        let result;

                                        if (technicalId && technicalId.length > 20 && technicalId !== 'auto') {
                                            console.log(`📡 Removendo via OrionAPI por ID: ${technicalId}`);
                                            result = await orionApi.from('span_technical_data').delete().eq('id', technicalId);
                                        } else {
                                            // Fallback Robusto: Remover por conexão de nomes de torres + projeto
                                            // Usamos os NOMES (start/end) pois é como o banco mapeia torres de KMZs
                                            console.log('🔄 Removendo por par de nomes de torres:', disconnectingSpan.start, disconnectingSpan.end);

                                            let query = orionApi.from('span_technical_data').delete();

                                            // Adicionar projectId se disponível para precisão
                                            if (disconnectingSpan.projectId && disconnectingSpan.projectId !== 'all') {
                                                query = query.eq('project_id', disconnectingSpan.projectId);
                                            }

                                            result = await query
                                                .eq('tower_start_id', disconnectingSpan.start)
                                                .eq('tower_end_id', disconnectingSpan.end);
                                        }

                                        if (result?.error) throw new Error(result.error.message);

                                        console.log('✅ Vão removido com sucesso do banco de dados');

                                        // PERSISTÊNCIA DA OCULTAÇÃO ESTÁVEL
                                        // Usamos os NOMES das torres como chave para garantir que vãos duplicados 
                                        // em múltiplos KMLs também sejam ocultados.
                                        const targetProjId = disconnectingSpan.projectId || projectId;

                                        if (onHidePlacemark && targetProjId && targetProjId !== 'all') {
                                            const normalizedStart = normalizeName(disconnectingSpan.start);
                                            const normalizedEnd = normalizeName(disconnectingSpan.end);
                                            const spanKey = `${normalizedStart}:::${normalizedEnd}`;

                                            onHidePlacemark(targetProjId, {
                                                id: spanKey,
                                                name: `${disconnectingSpan.start} ➝ ${disconnectingSpan.end}`,
                                                type: 'linestring',
                                                coordinates: { lat: 0, lng: 0, altitude: 0 },
                                                extendedData: { source: '3d_cable_interaction' }
                                            });
                                        }

                                        toast({
                                            title: "Vão removido",
                                            description: "A exclusão foi persistida no banco de dados com sucesso.",
                                        });

                                        // Limpar cache local de vãos se existir
                                        if (typeof (window as any).refetchSpans === 'function') {
                                            (window as any).refetchSpans();
                                        }

                                    } catch (err: any) {
                                        console.warn('⚠️ Nota de exclusão de vão:', err.message);

                                        // Treat 404 as "Already gone"
                                        if (err.message?.includes('404') || err.message?.includes('P2025') || err.message?.includes('not found')) {
                                            toast({
                                                title: "Sincronizado",
                                                description: "O elemento já havia sido removido ou não foi localizado no servidor.",
                                            });
                                        } else {
                                            toast({
                                                title: "Falha na exclusão",
                                                description: err.message || "Erro de conexão com o servidor",
                                                variant: "destructive"
                                            });
                                        }
                                    }
                                }
                                setIsDeleteSpanDialogOpen(false);
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest"
                        >
                            Excluir Vão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isElevationDialogOpen} onOpenChange={setIsElevationDialogOpen}>
                <AlertDialogContent className="glass-card border-white/10 max-w-xl p-8">
                    <AlertDialogHeader className="mb-6">
                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <Navigation className="w-6 h-6 text-emerald-400" />
                            Ajustar Elevação do Terreno
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-sm uppercase tracking-widest font-bold opacity-60">
                            Cota GPS atualizada para a base desta estrutura.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-8">
                        <Input
                            value={editingElevationValue}
                            onChange={(e) => setEditingElevationValue(e.target.value)}
                            placeholder="Ex: 850.00"
                            className="bg-black/60 border-white/10 text-white font-mono text-3xl h-20 text-center rounded-2xl shadow-inner focus:ring-emerald-500/20"
                            autoFocus
                            type="number"
                            step="0.01"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const elevation = parseFloat(editingElevationValue.replace(',', '.'));
                                    if (!isNaN(elevation) && editingElevationElement) {
                                        onUpdatePlacemarkElevation?.(editingElevationElement.docId, editingElevationElement.elementId, elevation);
                                    }
                                    setIsElevationDialogOpen(false);
                                }
                            }}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="glass-card border-white/10 hover:bg-white/5">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                const elevation = parseFloat(editingElevationValue.replace(',', '.'));
                                if (!isNaN(elevation) && editingElevationElement) {
                                    onUpdatePlacemarkElevation?.(editingElevationElement.docId, editingElevationElement.elementId, elevation);
                                }
                                setIsElevationDialogOpen(false);
                            }}
                            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest"
                        >
                            Salvar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >
            <Dialog open={isTransformDialogOpen} onOpenChange={setIsTransformDialogOpen}>
                <DialogContent className="glass-card border-white/10 bg-black/95 text-white max-w-5xl p-10 overflow-hidden">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="flex items-center gap-4 text-primary font-black uppercase tracking-[0.3em] text-xl">
                            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
                                <Settings className="w-7 h-7" />
                            </div>
                            Transformação 3D: {selectedPlacemark?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-white/40 font-bold uppercase tracking-[0.2em] mt-2 ml-14">
                            Sincronização em tempo real de escala, rotação e offsets técnicos.
                        </DialogDescription>
                    </DialogHeader>

                    {editingTransform && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                            {/* Escala e Altura Base */}
                            <div className="space-y-6">
                                <div className="space-y-4 p-4 bg-white/3 rounded-xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                                            <Ruler className="w-3 h-3 text-primary" /> Multiplicador Base
                                        </Label>
                                        <span className="text-xs font-black text-primary font-mono">{(editingTransform.baseHeight || 1).toFixed(2)}x</span>
                                    </div>
                                    <Slider
                                        value={[editingTransform.baseHeight || 1]}
                                        min={0.1} max={5} step={0.01}
                                        onValueChange={([v]) => setEditingTransform(prev => prev ? ({ ...prev, baseHeight: v }) : null)}
                                        className="py-2"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                                        <Maximize className="w-3 h-3 text-primary" /> Escala (X, Y, Z)
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['X', 'Y', 'Z'].map((axis, i) => (
                                            <div key={axis} className="space-y-1.5">
                                                <span className="text-[8px] font-black text-white/20 ml-1">{axis}</span>
                                                <Input
                                                    type="number" step="0.01"
                                                    value={editingTransform.scale[i]}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 1;
                                                        const ns = [...editingTransform.scale] as [number, number, number];
                                                        ns[i] = val;
                                                        setEditingTransform(prev => prev ? ({ ...prev, scale: ns }) : null);
                                                    }}
                                                    className="h-8 bg-black/40 border-white/5 text-[10px] font-mono text-center"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Rotação e Translação */}
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                                        <RotateCcw className="w-3 h-3 text-primary" /> Rotação (Graus)
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Pitch', 'Roll', 'Yaw'].map((axis, i) => (
                                            <div key={axis} className="space-y-1.5">
                                                <span className="text-[8px] font-black text-white/20 ml-1">{axis}</span>
                                                <Input
                                                    type="number" step="1"
                                                    value={editingTransform.rotation[i]}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const nr = [...editingTransform.rotation] as [number, number, number];
                                                        nr[i] = val;
                                                        setEditingTransform(prev => prev ? ({ ...prev, rotation: nr }) : null);
                                                    }}
                                                    className="h-8 bg-black/40 border-white/5 text-[10px] font-mono text-center"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                                        <Move className="w-3 h-3 text-primary" /> Deslocamento (Metros)
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['E', 'N', 'U'].map((axis, i) => (
                                            <div key={axis} className="space-y-1.5">
                                                <span className="text-[8px] font-black text-white/20 ml-1">{axis}</span>
                                                <Input
                                                    type="number" step="0.1"
                                                    value={editingTransform.offset[i]}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const no = [...editingTransform.offset] as [number, number, number];
                                                        no[i] = val;
                                                        setEditingTransform(prev => prev ? ({ ...prev, offset: no }) : null);
                                                    }}
                                                    className="h-8 bg-black/40 border-white/5 text-[10px] font-mono text-center"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => setEditingTransform({
                                        scale: [1, 1, 1],
                                        rotation: [0, 0, 0],
                                        offset: [0, 0, 0],
                                        baseHeight: 1
                                    })}
                                    className="w-full h-9 border-white/5 bg-white/2 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest gap-2"
                                >
                                    <RefreshCw className="w-3 h-3" /> Resetar
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t border-white/5 pt-6 gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAutoConnectAll}
                            disabled={isAutoConnecting || !projectId || projectId === 'all'}
                            className="w-full h-11 border-primary/30 text-primary hover:bg-primary/10 text-[10px] uppercase font-black tracking-widest gap-2"
                        >
                            <RefreshCw className={cn("w-4 h-4", isAutoConnecting && "animate-spin")} />
                            {isAutoConnecting ? 'Conectando...' : 'Auto-Conectar Projeto'}
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={() => setIsTransformDialogOpen(false)}
                            className="h-11 px-8 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                if (editingTransform && editingTransformTarget) {
                                    onUpdatePlacemarkTransform?.(
                                        editingTransformTarget.docId,
                                        editingTransformTarget.elementId,
                                        editingTransform
                                    );
                                }
                                setIsTransformDialogOpen(false);
                            }}
                            className="h-11 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest gap-2"
                        >
                            <SaveIcon className="w-4 h-4" /> Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


        </>
    );
};

