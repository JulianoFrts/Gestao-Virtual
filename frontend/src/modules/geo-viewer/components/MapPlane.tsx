import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, DoubleSide } from 'three';
import { latLonToTile, latLonToWorld, tileToLatLonBounds, TILE_SIZE, EARTH_RADIUS } from '../utils/tileUtils';
import { useGeoStore } from '../stores/useGeoStore';

interface TileProps {
    x: number;
    y: number;
    z: number;
    worldCenterLat: number;
    worldCenterLon: number;
    offline?: boolean;
}

const Tile = ({ x, y, z, worldCenterLat, worldCenterLon, offline = false }: TileProps) => {
    const url = offline
        ? `/tiles/${z}/${x}/${y}.png`
        : `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;

    const texture = useLoader(TextureLoader, url);

    const position = useMemo(() => {
        const bounds = tileToLatLonBounds(x, y, z);
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLon = (bounds.minLon + bounds.maxLon) / 2;
        // Calculate global position relative to world center
        const [posX, posY, posZ] = latLonToWorld(centerLat, centerLon, worldCenterLat, worldCenterLon);
        return [posX, 0, posZ] as [number, number, number];
    }, [x, y, z, worldCenterLat, worldCenterLon]);

    // Calculate generic tile size in meters at this latitude (approximate)
    // At equator, 1 degree longitude is ~111km.
    // This is a simplified scale for visualization, for high precision we would need more complex math per tile
    // But for now, we just want to see the tiles.
    // Actually, latLonToWorld gives us meters from center. We can compute bounds in meters to determine plane size.
    const size = useMemo(() => {
        const bounds = tileToLatLonBounds(x, y, z);
        const bl = latLonToWorld(bounds.minLat, bounds.minLon, worldCenterLat, worldCenterLon);
        const tr = latLonToWorld(bounds.maxLat, bounds.maxLon, worldCenterLat, worldCenterLon);

        // Width (East-West)
        const width = Math.abs(tr[0] - bl[0]);
        // Height (North-South) - in 3D this is Z
        const height = Math.abs(tr[2] - bl[2]);

        return [width, height];
    }, [x, y, z, worldCenterLat, worldCenterLon]);

    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[size[0], size[1]]} />
            <meshBasicMaterial map={texture} side={DoubleSide} />
        </mesh>
    );
};

export const MapPlane = ({ offline = false }: { offline?: boolean }) => {
    const { center, zoom } = useGeoStore();

    // Determine visible tiles based on center and zoom
    // For MVP, we just render a 3x3 grid around the center tile
    const tiles = useMemo(() => {
        const centerTile = latLonToTile(center.lat, center.lng, zoom);
        const tileList = [];
        const range = 2; // Render 5x5 grid

        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                tileList.push({
                    x: centerTile.x + dx,
                    y: centerTile.y + dy,
                    z: zoom
                });
            }
        }
        return tileList;
    }, [center, zoom]);

    return (
        <group>
            {tiles.map((t) => (
                <Tile
                    key={`${t.z}-${t.x}-${t.y}`}
                    x={t.x}
                    y={t.y}
                    z={t.z}
                    worldCenterLat={center.lat}
                    worldCenterLon={center.lng}
                    offline={offline}
                />
            ))}
        </group>
    );
};
