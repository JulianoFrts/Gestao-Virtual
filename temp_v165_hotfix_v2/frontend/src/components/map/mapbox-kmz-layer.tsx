import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Source, Layer, Popup, useMap } from 'react-map-gl/mapbox';
import type { KMLDocument, KMLPlacemark } from '@/types/kmz';
import type { LayerProps } from 'react-map-gl/mapbox';
import { Button } from '@/components/ui/button';
import { Navigation, X } from 'lucide-react';

interface MapboxKMZLayerProps {
    document: KMLDocument;
    hiddenPlacemarkIds?: Set<string>;
    placemarkOverrides?: Record<string, { name?: string, angle?: number, color?: string }>;
    show3D?: boolean;
    selectedPlacemark?: KMLPlacemark | null;
    onSelectPlacemark?: (placemark: KMLPlacemark | null) => void;
    onHidePlacemark?: (docId: string, placemark: KMLPlacemark) => void;
    selectedProjectId?: string;
}

export function MapboxKMZLayer({
    document,
    hiddenPlacemarkIds = new Set(),
    placemarkOverrides = {},
    show3D = false,
    selectedPlacemark,
    onSelectPlacemark,
    onHidePlacemark,
    selectedProjectId = 'all'
}: MapboxKMZLayerProps) {
    const { current: map } = useMap();
    const sourceId = useMemo(() => `kmz-data-${document.id || Math.random().toString(36).substr(2, 9)}`, [document.id]);

    const openInGPS = () => {
        if (!selectedPlacemark) return;
        const { lat, lng } = selectedPlacemark.coordinates;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    };

    // Convert KML placemarks to GeoJSON
    const geojsonData = useMemo(() => {
        const docId = document.id || document.name;

        const features = document.placemarks.map((placemark) => {
            const compositeId = `${docId}:::${placemark.id}`;
            const override = placemarkOverrides[compositeId];

            const normalizedName = (placemark.name || '').trim().toUpperCase();
            const isTowerFormat = /^(\d+[/-]\d+[A-Za-z]*|TRIO.*|[A-Za-z]+\d+.*|.*TORRE.*|.*ESTR.*|.*AP\d+.*|.*STR.*|.*V[/-]\d+.*|\d+)(?:\s*\/.*)?$/i.test(normalizedName);
            const isGenericPoint = /^PONTO[\s-]*\d+.*$/i.test(normalizedName);
            const isTechnicalPoint = placemark.type === 'point' && isTowerFormat && !isGenericPoint;

            // Ocultar elementos técnicos se nenhuma obra estiver selecionada
            if (selectedProjectId === 'all' && (isTechnicalPoint || placemark.type === 'linestring')) {
                return null;
            }

            if (placemark.type === 'point') {
                return {
                    type: 'Feature' as const,
                    id: placemark.id,
                    properties: {
                        id: placemark.id,
                        name: override?.name || placemark.name,
                        description: placemark.description,
                        type: placemark.type,
                        color: override?.color,
                        ...placemark.extendedData
                    },
                    geometry: {
                        type: 'Point' as const,
                        coordinates: [placemark.coordinates.lng, placemark.coordinates.lat]
                    }
                };
            }

            if (placemark.type === 'linestring' && placemark.path) {
                // Technical drawing style: default to electric blue or cyan if not specified
                let baseColor = placemark.style?.lineColor || '#22d3ee';
                if (placemark.name.toLowerCase().includes('área') || placemark.name.toLowerCase().includes('poligonal')) {
                    baseColor = '#22d3ee'; // Cyan for areas/poligonals
                }

                // If we have an override with an empty string, it means "Reset/Original"
                // If it's undefined, we use baseColor
                const finalColor = override?.color === '' ? baseColor : (override?.color || baseColor);



                return {
                    type: 'Feature' as const,
                    id: placemark.id,
                    properties: {
                        id: placemark.id,
                        name: override?.name || placemark.name,
                        description: placemark.description,
                        type: placemark.type,
                        lineColor: finalColor,
                        lineWidth: placemark.style?.lineWidth || 3,
                        ...placemark.extendedData
                    },
                    geometry: {
                        type: 'LineString' as const,
                        coordinates: placemark.path.map(p => [
                            p.lng,
                            p.lat,
                            0 // Fixado no chão conforme solicitado pelo usuário
                        ])
                    }

                };
            }

            if (placemark.type === 'polygon' && placemark.path) {
                const baseColor = placemark.style?.fillColor || '#22d3ee';
                const finalColor = override?.color === '' ? baseColor : (override?.color || baseColor);

                return {
                    type: 'Feature' as const,
                    id: placemark.id,
                    properties: {
                        id: placemark.id,
                        name: override?.name || placemark.name,
                        description: placemark.description,
                        type: placemark.type,
                        lineColor: finalColor, // Use finalColor (override) here as well
                        fillColor: finalColor,
                        fillOpacity: placemark.style?.fillOpacity || 0.25,
                        ...placemark.extendedData
                    },
                    geometry: {
                        type: 'Polygon' as const,
                        coordinates: [placemark.path.map(p => [p.lng, p.lat])]
                    }
                };
            }

            return null;
        }).filter(Boolean) as any[];

        // Filter out features that are hidden (either manually by user or by database is_hidden flag)
        const filteredFeatures = features.filter(f => {
            const isManualHidden = hiddenPlacemarkIds.has(`${docId}:::${f.id}`);
            const isDbHidden = f.properties?.is_hidden === true || f.properties?.isHidden === true || String(f.properties?.is_hidden).toLowerCase() === 'true' || Number(f.properties?.is_hidden) === 1;
            return !isManualHidden && !isDbHidden;
        });

        // TEST MODE: Allow KMZ LineStrings even in 3D to see "Tours" (Alignment, Centerline, etc)
        // We no longer strictly filter all LineStrings. 
        // We can add logic later to keep only technical ones if needed.
        /* 
        if (show3D) {
            filteredFeatures = filteredFeatures.filter(f => f.geometry.type !== 'LineString');
        }
        */

        return {
            type: 'FeatureCollection' as const,
            features: filteredFeatures
        };

    }, [document, hiddenPlacemarkIds, placemarkOverrides, selectedProjectId]);

    // Layer styles
    const pointLayer: LayerProps = {
        id: `${sourceId}-points`,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'point'],
        minzoom: 13.5,
        paint: {
            'circle-radius': 6,
            'circle-color': ['coalesce', ['get', 'color'], '#0ea5e9'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8
        }
    };

    const lineLayer: LayerProps = {
        id: `${sourceId}-lines`,
        type: 'line',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'linestring'],
        layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'line-elevation-reference': 'ground'
        },
        paint: {
            'line-color': [
                'case',
                ['in', 'ALIGNMENT', ['upcase', ['get', 'name']]], '#22d3ee',
                ['in', 'CENTERLINE', ['upcase', ['get', 'name']]], '#4ade80',
                ['in', 'OFFSET', ['upcase', ['get', 'name']]], '#fde047',
                ['coalesce', ['get', 'lineColor'], '#22d3ee']
            ],
            'line-width': [
                'case',
                ['any',
                    ['in', 'ALIGNMENT', ['upcase', ['get', 'name']]],
                    ['in', 'CENTERLINE', ['upcase', ['get', 'name']]],
                    ['in', 'OFFSET', ['upcase', ['get', 'name']]]
                ], 4,
                ['coalesce', ['get', 'lineWidth'], 3]
            ],
            'line-opacity': 1.0,
            // Halo effect for technical look
            'line-blur': 0.2
        }

    };


    const lineHaloLayer: LayerProps = {
        id: `${sourceId}-lines-halo`,
        type: 'line',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'linestring'],
        layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'line-elevation-reference': 'ground'
        },
        paint: {
            'line-color': '#ffffff',
            'line-width': ['+', ['get', 'lineWidth'], 2],
            'line-opacity': 0.3,
            'line-blur': 1
        }
    };

    const lineInteractionLayer: LayerProps = {
        id: `${sourceId}-lines-interaction`,
        type: 'line',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'linestring'],
        layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'line-elevation-reference': 'ground'
        },
        paint: {
            'line-width': 20,
            'line-opacity': 0
        }
    };

    const polygonFillLayer: LayerProps = {
        id: `${sourceId}-polygons-fill`,
        type: 'fill',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'polygon'],
        paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': 0.2
        }
    };

    const polygonOutlineLayer: LayerProps = {
        id: `${sourceId}-polygons-outline`,
        type: 'line',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'polygon'],
        layout: {
            'line-elevation-reference': 'ground'
        },
        paint: {
            'line-color': ['get', 'lineColor'],
            'line-width': 3,
            'line-opacity': 0.8
        }
    };

    const labelLayer: LayerProps = {
        id: `${sourceId}-labels`,
        type: 'symbol',
        source: sourceId,
        filter: [
            'all',
            ['==', ['get', 'type'], 'point'],
            ['all',
                ['!', ['in', 'PONTO', ['upcase', ['get', 'name']]]],
                ['!', ['in', 'TOUR', ['upcase', ['get', 'name']]]],
                ['!', ['in', 'FOTO', ['upcase', ['get', 'name']]]]
            ]
        ],
        minzoom: 14, // Começa a aparecer um pouco mais cedo
        layout: {
            'text-field': ['get', 'name'],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 10,
            'text-offset': [0, 0.5], // Pequeno ajuste para não sobrepor o ícone circular
            'text-anchor': 'top',
            'text-letter-spacing': 0.1,
            'text-transform': 'uppercase',
            'text-allow-overlap': false,
            'text-ignore-placement': false
        },
        paint: {
            'text-color': '#fbbf24', // Amarelo constante agora (único label)
            'text-halo-color': 'rgba(0, 0, 0, 0.8)',
            'text-halo-width': 1.5,
            'text-halo-blur': 0.5
        }
    };

    // Detail label removed in favor of unified yellow label layer above

    const highlightLayer: LayerProps = {
        id: `${sourceId}-highlight`,
        type: 'line',
        source: sourceId,
        filter: ['==', ['get', 'id'], selectedPlacemark?.id || ''],
        paint: {
            'line-color': '#fbbf24',
            'line-width': 5,
            'line-opacity': 1,
            'line-blur': 2
        }
    };

    const renderDescription = (html: string) => {
        if (!html) return null;
        const parts = html.split(/(<br\s*\/?>|<b\s*>|<\/b\s*>)/gi);
        return parts.map((part, i) => {
            const lower = part.toLowerCase();
            if (lower.startsWith('<br')) return <br key={i} />;
            if (lower === '<b>') return null;
            if (lower === '</b>') return null;

            const isBold = i > 0 && parts[i - 1].toLowerCase() === '<b>';
            if (isBold) return <strong key={i} className="text-primary font-black">{part}</strong>;

            return part;
        });
    };

    const onMapClick = useCallback((e: any) => {
        const features = e.features;
        if (features && features.length > 0) {
            const feature = features[0];
            const placemark = document.placemarks.find(p => p.id === feature.properties.id);
            if (placemark) {
                const isLineString = placemark.type === 'linestring';

                // Se for ponto e estiver no modo 3D com zoom alto, pulamos para evitar conflito com os marcadores 3D
                // Mas permitimos o clique em qualquer outro objeto (linhas, polígonos ou pontos normais)

                // If 3D is active and we are zoomed in, skip POINTS that have 3D models 
                // to avoid double popups, but allow clicking on CABLES/LINES.
                if (show3D && (map?.getZoom() || 0) > 15.5 && placemark.type === 'point') {
                    return;
                }

                onSelectPlacemark?.(placemark);
            }
        } else {
            onSelectPlacemark?.(null);
        }
    }, [document, show3D, map, onSelectPlacemark]);

    useEffect(() => {
        if (!map) return;

        const clickHandlers = [
            `${sourceId}-points`,
            `${sourceId}-lines`,
            `${sourceId}-lines-interaction`,
            `${sourceId}-polygons-fill`
        ];
        clickHandlers.forEach(layerId => {
            map.on('click', layerId, onMapClick);
        });

        return () => {
            clickHandlers.forEach(layerId => {
                map.off('click', layerId, onMapClick);
            });
        };
    }, [map, onMapClick]);

    return (
        <>
            <Source
                id={sourceId}
                type="geojson"
                data={geojsonData as GeoJSON.FeatureCollection}
                lineMetrics={true}
            >
                <Layer {...lineHaloLayer} />
                <Layer {...lineLayer} />
                <Layer {...lineInteractionLayer} />
                <Layer {...polygonFillLayer} />
                <Layer {...polygonOutlineLayer} />
                <Layer {...labelLayer} />
                <Layer
                    {...highlightLayer}
                    layout={{ visibility: selectedPlacemark ? 'visible' : 'none' }}
                />
            </Source>

            {!show3D && selectedPlacemark && document.placemarks.some(p => p.id === selectedPlacemark.id) && (
                <Popup
                    longitude={selectedPlacemark.coordinates.lng}
                    latitude={selectedPlacemark.coordinates.lat}
                    onClose={() => onSelectPlacemark?.(null)}
                    closeOnClick={false}
                    className="mapbox-popup-industrial"
                    maxWidth="340px"
                >
                    <div className="p-0 bg-background/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        {/* Technical Information Header */}
                        <div className="bg-primary/20 border-b border-white/5 p-5 relative overflow-hidden group">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 leading-none">
                                    ESPECIFICAÇÕES TÉCNICAS
                                </span>
                            </div>

                            <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1 drop-shadow-lg flex items-baseline gap-2">
                                {selectedPlacemark.extendedData?.['object_id'] || selectedPlacemark.extendedData?.['objectId'] || selectedPlacemark.extendedData?.['externalId'] || selectedPlacemark.name}
                                <span className="text-primary/40 text-sm font-light">/</span>
                                <span className="text-primary text-[16px] tracking-widest italic leading-none">
                                    {selectedPlacemark.extendedData?.['type'] || selectedPlacemark.extendedData?.['elementType'] || 'ESTRUTURA'}
                                </span>
                            </h3>

                            <div className="absolute top-2 -right-4 opacity-5 pointer-events-none">
                                <Navigation className="w-24 h-24 rotate-45" />
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex gap-2">
                                <Button
                                    onClick={openInGPS}
                                    className="flex-1 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-black text-[11px] uppercase tracking-widest gap-3 h-12 rounded-2xl shadow-glow transition-all active:scale-[0.98] group/btn"
                                >
                                    <Navigation className="w-4 h-4 fill-white/20 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    Ir para Localização
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (onHidePlacemark) {
                                            const docId = document.id || document.name;
                                            onHidePlacemark(docId, selectedPlacemark);
                                            onSelectPlacemark?.(null);
                                        }
                                    }}
                                    className="glass-card border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white h-12 w-12 p-0 rounded-2xl transition-all active:scale-[0.98]"
                                    title="Ocultar do Mapa"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(selectedPlacemark.extendedData?.object_height !== undefined || selectedPlacemark.extendedData?.objectHeight !== undefined || (selectedPlacemark.extendedData?.metadata as any)?.object_height !== undefined) && (
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-inner group/spec">
                                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 group-hover/spec:text-primary transition-colors">ALTURA</div>
                                        <div className="text-xl font-black tabular-nums text-white flex items-baseline gap-1">
                                            {selectedPlacemark.extendedData?.['object_height'] || selectedPlacemark.extendedData?.['objectHeight'] || (selectedPlacemark.extendedData?.metadata as any)?.object_height || '0.00'}
                                            <span className="text-sm text-primary opacity-50">m</span>
                                        </div>
                                    </div>
                                )}
                                {selectedPlacemark.extendedData?.deflection && (
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-inner group/spec">
                                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 group-hover/spec:text-primary transition-colors">ÂNGULO</div>
                                        <div className="text-[13px] font-black tabular-nums text-white truncate">
                                            {selectedPlacemark.extendedData.deflection}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">POSICIONAMENTO UTM</span>
                                    <div className="px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-primary">FUSO {selectedPlacemark.extendedData?.fuso_object || '--'}</span>
                                    </div>
                                </div>
                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 font-mono text-[11px] flex flex-col gap-2 shadow-inner ring-1 ring-white/5">
                                    <div className="flex justify-between items-center opacity-80 group/utm transition-colors hover:bg-white/5 p-1 rounded-lg">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter group-hover/utm:text-white transition-colors">FUSO:</span>
                                        <span className="font-black tabular-nums tracking-wider text-white">
                                            {selectedPlacemark.extendedData?.fuso_object || '--'}
                                        </span>

                                    </div>
                                    <div className="flex justify-between items-center opacity-80 group/utm transition-colors hover:bg-white/5 p-1 rounded-lg">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter group-hover/utm:text-white transition-colors">COORD X:</span>
                                        <span className="font-black tabular-nums tracking-wider text-white">
                                            {selectedPlacemark.extendedData?.['x_cord_object'] || selectedPlacemark.coordinates.lat.toFixed(6)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center opacity-80 group/utm transition-colors hover:bg-white/5 p-1 rounded-lg">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter group-hover/utm:text-white transition-colors">COORD Y:</span>
                                        <span className="font-black tabular-nums tracking-wider text-white">
                                            {selectedPlacemark.extendedData?.['y_cord_object'] || selectedPlacemark.coordinates.lng.toFixed(6)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Popup>
            )}
        </>
    );
}
