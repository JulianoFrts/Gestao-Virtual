import React, { useState, useCallback, useRef, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox';
import type { MapLocation, MapConfig } from '@/types/map';
import type { KMLDocument, KMLPlacemark } from '@/types/kmz';
import { MapboxKMZLayer } from './mapbox-kmz-layer';
import { Mapbox3DLayer } from './mapbox-3d-layer';
import { MapboxCableInteraction } from './mapbox-cable-interaction';
import { CanvasCableLayer } from './canvas-cable-layer';
import { useEnrichedPlacemarks } from '@/hooks/useEnrichedPlacemarks';
import { useMap } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { Camera, Activity, HardHat, Truck, Share2, Download, Cable } from 'lucide-react';
import { CableConfigModal, CableSettings, DEFAULT_CABLE_SETTINGS, ModelTransform } from './cable-config-modal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { db } from '@/integrations/database';


import { Button } from '@/components/ui/button';

interface MapboxMapProps {
    locations?: MapLocation[];
    config?: Partial<MapConfig>;
    onMarkerClick?: (location: MapLocation) => void;
    kmlDocuments?: KMLDocument[];
    isLoading?: boolean;
    hiddenPlacemarkIds?: Set<string>;
    placemarkOverrides?: Record<string, { name?: string, angle?: number, color?: string, height?: number, elevation?: number, customModelUrl?: string }>;
    show3D?: boolean;
    onHidePlacemark?: (docId: string, placemark: KMLPlacemark) => void;
    onUpdatePlacemarkAngle?: (docId: string, elementId: string, newAngle: number) => void;
    onUpdatePlacemarkColor?: (docId: string, elementId: string, newColor: string) => void;
    onUpdatePlacemarkHeight?: (docId: string, elementId: string, newHeight: number) => void;
    onUpdatePlacemarkElevation?: (docId: string, elementId: string, newElevation: number) => void;
    onUpdatePlacemarkModel?: (docId: string, elementId: string, modelUrl: string) => void;
    onUpdatePlacemarkTransform?: (docId: string, elementId: string, transform: ModelTransform) => void;
    onUpdatePlacemarkTexture?: (docId: string, elementId: string, newTexture: string) => void;
    projectSpans?: any[];
    selectedProjectId?: string;
    canUpdate?: boolean;
    onSelectPlacemark?: (placemark: KMLPlacemark | null) => void;
    cableSettings?: CableSettings;
    onUpdateCableSettings?: (settings: CableSettings) => Promise<void>;
}

export function MapboxMap({
    locations = [],
    config,
    onMarkerClick,
    kmlDocuments = [],
    isLoading = false,
    hiddenPlacemarkIds = new Set(),
    placemarkOverrides = {},
    show3D = false,
    onHidePlacemark,
    onUpdatePlacemarkAngle,
    onUpdatePlacemarkColor,
    onUpdatePlacemarkHeight,
    onUpdatePlacemarkElevation,
    onUpdatePlacemarkModel,
    onUpdatePlacemarkTransform,
    onUpdatePlacemarkTexture,
    projectSpans = [],
    selectedProjectId,
    canUpdate = false,
    onSelectPlacemark,
    cableSettings: propCableSettings,
    onUpdateCableSettings
}: MapboxMapProps) {
    const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
    const [selectedPlacemark, setSelectedPlacemark] = useState<KMLPlacemark | null>(null);
    const enrichedPlacemarks = useEnrichedPlacemarks(kmlDocuments, placemarkOverrides, hiddenPlacemarkIds, selectedProjectId);
    const [isMapReady, setIsMapReady] = useState(false);
    const [screenshotData, setScreenshotData] = useState<{ url: string, blob: Blob } | null>(null);
    const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);
    const [terrainElevation, setTerrainElevation] = useState<number | null>(null);
    const { toast } = useToast();

    // Cable Configuration State
    const [isCableConfigOpen, setIsCableConfigOpen] = useState(false);

    // Internal state for cable settings if not provided by prop (fallback)
    const [internalCableSettings, setInternalCableSettings] = useState<CableSettings>(DEFAULT_CABLE_SETTINGS);
    const cableSettings = useMemo(() => {
        const base = propCableSettings || internalCableSettings;
        return {
            ...DEFAULT_CABLE_SETTINGS,
            ...base,
            anchors: base?.anchors?.length ? base.anchors : DEFAULT_CABLE_SETTINGS.anchors
        };
    }, [propCableSettings, internalCableSettings]);

    const handleSaveCableSettings = async (settings: CableSettings) => {
        if (onUpdateCableSettings) {
            await onUpdateCableSettings(settings);
        } else {
            setInternalCableSettings(settings);
        }
    };

    // Vite picks from .env.local first (if exists), then .env
    // Use a single variable name: VITE_MAPBOX_API_KEY in both files
    const mapboxToken = import.meta.env.VITE_MAPBOX_API_KEY;

    const defaultConfig: MapConfig = {
        center: { lat: -23.5505, lng: -46.6333 }, // São Paulo
        zoom: 12,
        mapTypeId: 'satellite',
        ...config
    };

    // Convert mapTypeId to Mapbox style
    const getMapStyle = (mapTypeId: string): string | import('mapbox-gl').Style => {
        switch (mapTypeId) {
            case 'satellite':
            case 'hybrid':
                return 'mapbox://styles/mapbox/satellite-streets-v12';
            case 'terrain':
                return 'mapbox://styles/mapbox/outdoors-v12';
            case 'none':
                return {
                    version: 8,
                    sources: {
                        'mapbox-dem': {
                            type: 'raster-dem',
                            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                            tileSize: 512,
                            maxzoom: 14
                        }
                    },
                    layers: [
                        {
                            id: 'background',
                            type: 'background',
                            paint: { 'background-color': '#09090b' }
                        }
                    ]
                } as any;
            case 'roadmap':
            default:
                return 'mapbox://styles/mapbox/dark-v11';
        }
    };

    const [viewState, setViewState] = useState({
        longitude: defaultConfig.center.lng,
        latitude: defaultConfig.center.lat,
        zoom: defaultConfig.zoom,
        bearing: 0,
        pitch: 0
    });

    const mapRef = React.useRef<any>(null);
    const lastBoundsRef = React.useRef<string>("");
    const pendingFlightRef = React.useRef<any>(null);
    const hasFlownRef = React.useRef<string>(""); // Track which config we've already flown to

    // Handle map load - execute any pending flights and configure 3D terrain
    const onMapLoad = useCallback((evt: any) => {
        setIsMapReady(true);
        const map = evt.target;

        if (map) {
            // Add Terrain and 3D Lights for better GLTF rendering
            if (!map.getSource('mapbox-dem')) {
                map.addSource('mapbox-dem', {
                    'type': 'raster-dem',
                    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    'tileSize': 512,
                    'maxzoom': 14
                });
            }
            //map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.0 });
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.0 });

            /*
            // Add Fog for realistic horizon and occlusion of distant objects
            map.setFog({
                'range': [0.5, 10],
                'color': '#1a1c24',
                'high-color': '#242b3b',
                'space-color': '#000000',
                'horizon-blend': 0.1
            });
            */
            // PREVENTIVE FIX: Explicitly add common missing icons to stop errors immediately
            const addPlaceholder = (id: string) => {
                if (map.hasImage(id)) return;
                const width = 64;
                const height = 64;
                const img = new ImageData(width, height);
                const data = img.data;
                // Generate a transparent or grey placeholder
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 128;     // R
                    data[i + 1] = 128; // G
                    data[i + 2] = 128; // B
                    data[i + 3] = 128; // Alpha (Semi-transparent)
                }
                map.addImage(id, img);
                console.log(`🛡️ [Mapbox] Preventively added placeholder for '${id}'`);
            };

            // Fix specific known errors
            addPlaceholder('br-state-4');
            addPlaceholder('icon-default');

            // Handle any other missing images dynamically
            map.on('styleimagemissing', (e: any) => {
                const id = e.id;
                // Check again to prevent race conditions
                if (!map.hasImage(id)) {
                    console.warn(`⚠️ [Mapbox] Missing image '${id}' detected. Auto-generating placeholder.`);
                    addPlaceholder(id);
                }
            });

            if (pendingFlightRef.current) {
                const { type, data } = pendingFlightRef.current;
                if (type === 'bounds') {
                    map.fitBounds(data.bounds, data.options);
                } else if (type === 'flyTo') {
                    map.flyTo(data);
                }
                pendingFlightRef.current = null;
            }
        }
    }, []);

    // Update viewState if config changes (e.g. from parent)
    // RULE: Only fly when NOT loading and map is ready
    React.useEffect(() => {
        // Don't fly if still loading KMZ data
        if (isLoading) return;

        const configKey = JSON.stringify(config);

        // Prevent duplicate flights to same destination
        if (hasFlownRef.current === configKey) return;

        if (config?.bounds) {
            const flightData = {
                type: 'bounds' as const,
                data: {
                    bounds: config.bounds,
                    options: {
                        padding: { top: 120, bottom: 120, left: 120, right: 120 },
                        duration: 3000,
                        essential: true,
                        maxZoom: 18
                    }
                }
            };

            if (isMapReady && mapRef.current) {
                hasFlownRef.current = configKey;
                lastBoundsRef.current = JSON.stringify(config.bounds);
                mapRef.current.fitBounds(config.bounds, flightData.data.options);
            } else {
                pendingFlightRef.current = flightData;
            }
            return;
        }

        // For center-based navigation, use flyTo for smooth animation from current position
        if (config?.center) {
            const flightData = {
                type: 'flyTo' as const,
                data: {
                    center: [config.center.lng, config.center.lat],
                    zoom: config.zoom ?? 15,
                    duration: 2500,
                    essential: true
                }
            };

            if (isMapReady && mapRef.current) {
                hasFlownRef.current = configKey;
                lastBoundsRef.current = "";
                mapRef.current.flyTo(flightData.data);
            } else {
                pendingFlightRef.current = flightData;
            }
        }
    }, [config, isLoading, isMapReady]);

    const [cursor, setCursor] = useState<string>('auto');

    const onMouseEnter = useCallback(() => setCursor('pointer'), []);
    const onMouseLeave = useCallback(() => setCursor('auto'), []);

    const interactiveLayerIds = useMemo(() => {
        const base = ['kmz-points', 'kmz-lines', 'kmz-polygons-fill'];
        if (!show3D) base.push('cable-interaction-layer');
        return base;
    }, [show3D]);

    const containerRef = useRef<HTMLDivElement>(null);

    if (!mapboxToken) {
        return (
            <div className="flex items-center justify-center p-8 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-bold h-full">
                Erro: API Key do Mapbox não configurada (VITE_MAPEBOX_API_KEY)
            </div>
        );
    }



    // Screenshot function using Mapbox native canvas
    const handleMapScreenshot = async () => {
        if (!mapRef.current) return;

        try {
            const mapCanvas = mapRef.current.getCanvas();
            const imageUrl = mapCanvas.toDataURL('image/png');
            const blob = await (await fetch(imageUrl)).blob();

            setScreenshotData({ url: imageUrl, blob });
            setShowScreenshotDialog(true);
        } catch (error) {
            console.error('Erro ao capturar mapa:', error);
            toast({
                title: "Erro na captura",
                description: "Não foi possível capturar o mapa no momento.",
                variant: "destructive"
            });
        }
    };

    const handleShare = async () => {
        if (!screenshotData) return;

        const { blob, url } = screenshotData;
        const file = new File([blob], `mapa-${Date.now()}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'Captura do Mapa',
                    text: 'Visualização do projeto',
                    files: [file]
                });
                setShowScreenshotDialog(false);
            } catch (e) {
                if ((e as Error).name !== 'AbortError') {
                    handleDownload();
                }
            }
        } else {
            handleDownload();
        }
    };

    const handleDownload = () => {
        if (!screenshotData) return;
        const link = document.createElement('a');
        link.download = `mapa-${Date.now()}.png`;
        link.href = screenshotData.url;
        link.click();
        setShowScreenshotDialog(false);
        toast({
            title: "Download iniciado",
            description: "O mapa foi salvo em seu dispositivo."
        });
    };



    return (
        <>
            <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative group/map">
                <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={evt => {
                        setViewState(evt.viewState);
                        const map = mapRef.current?.getMap();
                        if (map) {
                            const elevation = map.queryTerrainElevation({
                                lng: evt.viewState.longitude,
                                lat: evt.viewState.latitude
                            });
                            setTerrainElevation(elevation);
                        }
                    }}
                    onLoad={onMapLoad}
                    mapboxAccessToken={mapboxToken}
                    style={{ width: '100%', height: '100%', minHeight: '500px' }}
                    mapStyle={getMapStyle(defaultConfig.mapTypeId || 'satellite')}
                    attributionControl={false}
                    interactiveLayerIds={interactiveLayerIds}
                    cursor={cursor}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    preserveDrawingBuffer={true}
                    onClick={(evt) => {
                        const feature = evt.features?.[0];
                        if (feature && feature.layer && feature.layer.id === 'cable-interaction-layer') {
                            const spanData = feature.properties;
                            if (!spanData) return;
                            const virtualPlacemark: KMLPlacemark = {
                                id: spanData.id,
                                name: `Vão ${spanData.tower_start_id} - ${spanData.tower_end_id}`,
                                type: 'linestring',
                                coordinates: { lng: evt.lngLat.lng, lat: evt.lngLat.lat, altitude: 0 },
                                extendedData: {
                                    ...spanData,
                                    source: '3d_cable_virtual_layer',
                                    type: spanData.cable_type || 'Cabo de Transmissão'
                                }
                            };
                            setSelectedPlacemark(virtualPlacemark);
                            onSelectPlacemark?.(virtualPlacemark);
                        }
                    }}
                >
                    {/* Zoom Level Indicator + Screenshot Button */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass-card px-4 py-1.5 rounded-full border-white/10 flex items-center gap-3 shadow-xl backdrop-blur-md transition-all group-hover/map:scale-105">
                        <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Magnificação</span>
                            <span className="text-xs font-black tabular-nums text-primary">{viewState.zoom.toFixed(1)}x</span>
                        </div>
                        <div className="flex items-center gap-1.5 border-r border-white/10 pr-3 group/elevation">
                            <span className="text-[8px] font-black uppercase tracking-widest text-primary/60 px-1.5 py-0.5 rounded-sm bg-primary/10 border border-primary/20">ELEVAÇÃO</span>
                            <span className="text-xs font-black tabular-nums text-foreground group-hover/elevation:text-primary transition-colors">
                                {terrainElevation !== null
                                    ? `${Math.round(terrainElevation).toLocaleString()}m`
                                    : `${Math.round(Math.pow(2, 20 - viewState.zoom) * 10).toLocaleString()}m`
                                }
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Ângulo</span>
                            <span className="text-xs font-black tabular-nums text-emerald-500">
                                {(() => {
                                    const bearing = (viewState.bearing + 360) % 360;
                                    const degrees = Math.floor(bearing);
                                    const minutesDecimal = (bearing - degrees) * 60;
                                    const minutes = Math.floor(minutesDecimal);
                                    const seconds = Math.floor((minutesDecimal - minutes) * 60);

                                    let direction = 'N';
                                    if (bearing >= 22.5 && bearing < 67.5) direction = 'NE';
                                    else if (bearing >= 67.5 && bearing < 112.5) direction = 'E';
                                    else if (bearing >= 112.5 && bearing < 157.5) direction = 'SE';
                                    else if (bearing >= 157.5 && bearing < 202.5) direction = 'S';
                                    else if (bearing >= 202.5 && bearing < 247.5) direction = 'SW';
                                    else if (bearing >= 247.5 && bearing < 292.5) direction = 'W';
                                    else if (bearing >= 292.5 && bearing < 337.5) direction = 'NW';

                                    return `${degrees}°${minutes}'${seconds}''${direction}`;
                                })()}
                            </span>
                        </div>
                        <button
                            onClick={handleMapScreenshot}
                            className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                            title="Capturar Mapa"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>


                    {/* Left-side indicators (visible in fullscreen) */}
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <div className="glass-card px-3 py-1.5 rounded-full border-white/10 flex items-center gap-2 shadow-xl backdrop-blur-md">
                            <Activity className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Ativo</span>
                        </div>
                        <div className="glass-card px-3 py-1.5 rounded-full border-white/10 flex items-center gap-2 shadow-xl backdrop-blur-md">
                            <HardHat className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-black tabular-nums">124</span>
                        </div>
                        <div className="glass-card px-3 py-1.5 rounded-full border-white/10 flex items-center gap-2 shadow-xl backdrop-blur-md">
                            <Truck className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-black tabular-nums">08</span>
                        </div>
                        {/* Cable Config Button */}
                        {canUpdate && (
                            <button
                                onClick={() => setIsCableConfigOpen(true)}
                                className="glass-card px-3 py-1.5 rounded-full border-cyan-500/30 flex items-center gap-2 shadow-xl backdrop-blur-md hover:bg-cyan-500/20 transition-all cursor-pointer"
                                title="Configurar Cabos 3D"
                            >
                                <Cable className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Cabos 3D</span>
                            </button>
                        )}
                    </div>

                    <NavigationControl position="bottom-right" />
                    <FullscreenControl position="bottom-right" />

                    {locations.map((location) => (
                        <Marker
                            key={location.id}
                            longitude={location.lng}
                            latitude={location.lat}
                            anchor="bottom"
                            draggable={false}
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                setSelectedLocation(location);
                                onMarkerClick?.(location);
                            }}
                        >
                            <div className="relative group/marker cursor-pointer" style={{ pointerEvents: 'none' }}>
                                <div className="absolute -inset-2 bg-primary/20 rounded-full blur-sm group-hover/marker:bg-primary/40 transition-all" />
                                <div className="w-6 h-6 bg-linear-to-br from-primary to-primary-foreground rounded-full border-2 border-white shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-transform hover:scale-110 relative z-10 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full shadow-inner" />
                                </div>
                            </div>
                        </Marker>
                    ))}

                    {selectedLocation && (
                        <Popup
                            longitude={selectedLocation.lng}
                            latitude={selectedLocation.lat}
                            anchor="bottom"
                            onClose={() => setSelectedLocation(null)}
                            closeOnClick={false}
                            className="mapbox-popup-industrial"
                        >
                            <div className="p-4 min-w-[180px] bg-card/95 backdrop-blur-md">
                                <h3 className="font-bold text-sm mb-1 text-primary">{selectedLocation.title}</h3>
                                {selectedLocation.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {selectedLocation.description}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    )}

                    {kmlDocuments.map((doc, idx) => (
                        <MapboxKMZLayer
                            key={`kmz-layer-${doc.id || doc.name}-${idx}`}
                            document={doc}
                            hiddenPlacemarkIds={hiddenPlacemarkIds}
                            placemarkOverrides={placemarkOverrides}
                            show3D={show3D}
                            selectedPlacemark={selectedPlacemark}
                            onSelectPlacemark={(p) => {
                                setSelectedPlacemark(p);
                                onSelectPlacemark?.(p);
                            }}
                            onHidePlacemark={onHidePlacemark}
                            selectedProjectId={selectedProjectId}
                        />
                    ))}


                    {!show3D && (
                        <>
                            <CanvasCableLayer
                                projectSpans={projectSpans}
                                visibleTowers={enrichedPlacemarks}
                                hiddenPlacemarkIds={hiddenPlacemarkIds}
                                projectId={selectedProjectId}
                            />

                            <MapboxCableInteraction
                                projectSpans={projectSpans}
                                visibleTowers={enrichedPlacemarks}
                                hiddenPlacemarkIds={hiddenPlacemarkIds}
                                projectId={selectedProjectId}
                                onSelectSpan={onSelectPlacemark}
                            />
                        </>
                    )}

                    {/* The 3D/Volumetric cables are handled inside Mapbox3DLayer */}

                    <Mapbox3DLayer
                        kmlDocuments={kmlDocuments}
                        show3D={show3D}
                        selectedPlacemark={selectedPlacemark}
                        onSelectPlacemark={(p) => {
                            setSelectedPlacemark(p);
                            onSelectPlacemark?.(p);
                        }}
                        onHidePlacemark={onHidePlacemark}
                        onUpdatePlacemarkAngle={onUpdatePlacemarkAngle}
                        onUpdatePlacemarkColor={onUpdatePlacemarkColor}
                        onUpdatePlacemarkHeight={onUpdatePlacemarkHeight}
                        onUpdatePlacemarkElevation={onUpdatePlacemarkElevation}
                        onUpdatePlacemarkModel={onUpdatePlacemarkModel}
                        onUpdatePlacemarkTransform={onUpdatePlacemarkTransform}
                        onUpdatePlacemarkTexture={onUpdatePlacemarkTexture}
                        canUpdate={canUpdate}
                        hiddenPlacemarkIds={hiddenPlacemarkIds}
                        placemarkOverrides={placemarkOverrides}
                        projectSpans={projectSpans}
                        projectId={selectedProjectId}
                        cableSettings={cableSettings}
                        onUpdateCableSettings={handleSaveCableSettings}
                    />
                </Map>
            </div>

            <AlertDialog open={showScreenshotDialog} onOpenChange={setShowScreenshotDialog}>
                <AlertDialogContent className="glass-card border-white/10 max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-primary" />
                            Captura Realizada
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-white/70">
                            A imagem do mapa foi processada com sucesso.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {screenshotData && (
                        <div className="my-4 rounded-lg overflow-hidden border border-white/5 aspect-video bg-black/40">
                            <img src={screenshotData.url} alt="Captura" className="w-full h-full object-cover" />
                        </div>
                    )}

                    <AlertDialogFooter className="flex flex-row justify-center items-center gap-2 mt-6 px-2 sm:justify-center">
                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 h-8 text-[10px] uppercase font-bold tracking-wider px-4 mt-0 sm:mt-0">
                            Fechar
                        </AlertDialogCancel>
                        <Button
                            variant="outline"
                            className="border-primary/30 hover:bg-primary/5 text-primary gap-1.5 h-8 text-[10px] uppercase font-bold tracking-wider px-4"
                            onClick={handleDownload}
                        >
                            <Download className="w-3.5 h-3.5" />
                            Salvar
                        </Button>
                        <Button
                            className="gradient-primary gap-1.5 h-8 text-[10px] uppercase font-bold tracking-wider px-4"
                            onClick={handleShare}
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            Enviar
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Cable Configuration Modal */}
            <CableConfigModal
                isOpen={isCableConfigOpen}
                onClose={() => setIsCableConfigOpen(false)}
                settings={cableSettings}
                onSave={handleSaveCableSettings}
            />
        </>
    );
}

