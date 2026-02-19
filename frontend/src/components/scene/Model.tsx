import { useGLTF, Center } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'
import { v4 as uuid } from 'uuid'
import { useAnchorStore } from '@/store/anchorStore'
import { useEffect } from 'react'
export function Model() {
    const MODEL_URL = '/models/towers/scene.gltf'
    const { scene } = useGLTF(MODEL_URL)
    const addAnchor = useAnchorStore(s => s.addAnchor)


    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()

        addAnchor({
            id: uuid(),
            position: e.point.clone(),
            normal: e.face?.normal.clone(),
            faceIndex: e.faceIndex ?? undefined,
            meshName: e.object.name,
            createdAt: new Date().toISOString()
        })
    }

    return (
        // Rotate 90 degrees on X to stand it up (fix orientation)
        // Use Center to ensure it sits on the grid (ground level)
        // Note: This is inside the Scene group which handles rotation, but Center handles the offset.
        // If we rotate in Scene, we might not need rotation here, or we need to align axes.
        // Actually, if Scene is rotated, Model is effectively upright.
        // Center 'bottom' aligns the geometric bottom to 0.
        <primitive object={scene} onPointerDown={handleClick} scale={1} position={[0, 1, 0]} />
    )
}
