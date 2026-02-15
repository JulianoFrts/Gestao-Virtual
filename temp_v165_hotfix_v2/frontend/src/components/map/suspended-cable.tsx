import React, { useEffect } from 'react';
import { useMap } from 'react-map-gl/mapbox';
import * as turf from '@turf/turf';

interface towerData {
    coordinates: { lng: number; lat: number };
    height: number;
    id?: string;
}

interface SuspendedCableProps {
    tower1: towerData;
    tower2: towerData;
    towerVerticalOffset?: number;
    color?: string;
    width?: number; // width in meters
    id?: string;
}

export const SuspendedCable: React.FC<SuspendedCableProps> = ({
    tower1,
    tower2,
    towerVerticalOffset = 0,
    color = '#000000',
    width = 0.5,
    id = 'suspended-cable'
}) => {
    const { current: map } = useMap();

    useEffect(() => {
        if (!map) return;

        const h1 = tower1.height + towerVerticalOffset;
        const h2 = tower2.height + towerVerticalOffset;
        const averageHeight = (h1 + h2) / 2;

        // Create line between the two towers
        const line = turf.lineString([
            [tower1.coordinates.lng, tower1.coordinates.lat],
            [tower2.coordinates.lng, tower2.coordinates.lat]
        ]);

        // Create a buffer (strip) around the line
        const buffer = turf.buffer(line, width / 2, { units: 'meters' });

        const sourceId = `cable-source-${id}`;
        const layerId = `cable-layer-${id}`;

        const mapInstance = map.getMap();
        if (mapInstance.getSource(sourceId)) {
            (mapInstance.getSource(sourceId) as any).setData(buffer);
        } else {
            mapInstance.addSource(sourceId, {
                type: 'geojson',
                data: buffer
            });

            mapInstance.addLayer({
                id: layerId,
                type: 'fill-extrusion',
                source: sourceId,
                paint: {
                    'fill-extrusion-color': color,
                    'fill-extrusion-height': averageHeight,
                    'fill-extrusion-base': averageHeight - 0.2, // Small thickness
                    'fill-extrusion-opacity': 0.8
                }
            });
        }

        return () => {
            if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId);
            if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
        };
    }, [map, tower1, tower2, towerVerticalOffset, color, width, id]);

    return null;
};
