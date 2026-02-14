import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { latLonToWorld } from '../utils/tileUtils';
import { useGeoStore } from '../stores/useGeoStore';

interface ModelLoaderProps {
    url: string;
    latitude: number;
    longitude: number;
    scale?: [number, number, number] | number;
    rotation?: [number, number, number];
    altitude?: number; // Optional altitude offset in meters
}

export const ModelLoader = ({
    url,
    latitude,
    longitude,
    scale = 1,
    rotation = [0, 0, 0],
    altitude = 0
}: ModelLoaderProps) => {
    const { center } = useGeoStore();
    const { scene } = useGLTF(url); // Load the GLB/GLTF model

    // Calculate position in the 3D world relative to the current center
    const position = useMemo(() => {
        const [x, y, z] = latLonToWorld(latitude, longitude, center.lat, center.lng);
        // Add altitude to y-axis (Up)
        return [x, y + altitude, z] as [number, number, number];
    }, [latitude, longitude, center.lat, center.lng, altitude]);

    // Clone the scene to allow multiple instances of the same model if needed
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    return (
        <primitive
            object={clonedScene}
            position={position}
            scale={scale}
            rotation={rotation}
        />
    );
};
