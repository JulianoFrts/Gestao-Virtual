import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { MapPlane } from './MapPlane';
import { ModelLoader } from './ModelLoader';

export const Scene = ({ offline = false }: { offline?: boolean }) => {
    return (
        <Canvas
            camera={{ position: [0, 500, 500], fov: 60 }}
            style={{ width: '100%', height: '100%', background: '#1a1a1a' }}
        >
            <ambientLight intensity={0.5} />
            <directionalLight position={[100, 100, 50]} intensity={1} />

            <group>
                <MapPlane offline={offline} />

                {/* Visual Debug Marker at Center (Red Sphere) */}
                <mesh position={[0, 10, 0]}>
                    <sphereGeometry args={[2, 32, 32]} />
                    <meshStandardMaterial color="red" />
                </mesh>

                <Suspense fallback={null}>
                    <ModelLoader
                        url="/models/towers/scene.gltf"
                        latitude={-43.7689477}
                        longitude={-22.65294843}
                        scale={45}
                        altitude={45}
                        rotation={[0, 0, 0]} // Example rotation, likely roughly aligned
                    />
                </Suspense>
            </group>

            <OrbitControls
                enableDamping
                dampingFactor={0.06}
                minDistance={10}
                maxDistance={5000}
            />

            <gridHelper args={[10000, 100]} position={[0, -0.1, 0]} />
            <axesHelper args={[100]} />

            <Environment preset="city" />
        </Canvas>
    );
};
