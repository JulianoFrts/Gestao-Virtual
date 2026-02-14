import { Canvas } from '@react-three/fiber'
import { CameraControls, GizmoHelper, GizmoViewcube, GizmoViewport } from '@react-three/drei'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCameraStore, CameraView } from '@/store/useCameraStore'
import { Model } from './Model'
import { Anchors } from './Anchors'
import { CameraSettingsPanel } from './CameraSettingsPanel'

function CameraController({ enabled }: { enabled: boolean }) {
    const { view, zoomToCursor, cameraPosition, setCameraPosition, sensitivity } = useCameraStore()
    const cameraControlsRef = useRef<CameraControls>(null)
    const [isCtrlPressed, setIsCtrlPressed] = useState(false)
    const isUpdatingRef = useRef(false)

    // Sync Store -> Camera (Code-driven update)
    useEffect(() => {
        const controls = cameraControlsRef.current
        if (!controls) return

        const currentPos = new THREE.Vector3()
        controls.getPosition(currentPos)

        // Only update if difference is significant (> 0.01m)
        const dist = currentPos.distanceTo(new THREE.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z))
        if (dist > 0.1) {
            isUpdatingRef.current = true
            controls.setPosition(cameraPosition.x, cameraPosition.y, cameraPosition.z, true).then(() => {
                isUpdatingRef.current = false
            })
        }
    }, [cameraPosition])

    // Sync Camera -> Store (User-driven update)
    useEffect(() => {
        const controls = cameraControlsRef.current
        if (!controls) return

        const onUpdate = () => {
            // Block if we are currently syncing from store to camera
            if (isUpdatingRef.current) return

            const pos = new THREE.Vector3()
            controls.getPosition(pos)

            // Use getState() to always have the latest reference for comparison without dependency thrashing
            const latestPos = useCameraStore.getState().cameraPosition
            const currentPosVec = new THREE.Vector3(pos.x, pos.y, pos.z)
            const latestPosVec = new THREE.Vector3(latestPos.x, latestPos.y, latestPos.z)

            // Only update store if difference is significant
            if (currentPosVec.distanceTo(latestPosVec) > 0.05) {
                setCameraPosition({ x: pos.x, y: pos.y, z: pos.z })
            }
        }

        controls.addEventListener('update', onUpdate)
        return () => controls.removeEventListener('update', onUpdate)
    }, []) // Stable listener

    // WASD Fly Controls
    const keys = useRef({ w: false, a: false, s: false, d: false })

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control') setIsCtrlPressed(true)
            const k = e.key.toLowerCase()
            if (Object.prototype.hasOwnProperty.call(keys.current, k)) keys.current[k as keyof typeof keys.current] = true
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control') setIsCtrlPressed(false)
            const k = e.key.toLowerCase()
            if (Object.prototype.hasOwnProperty.call(keys.current, k)) keys.current[k as keyof typeof keys.current] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [])

    useFrame((_, delta) => {
        const controls = cameraControlsRef.current
        if (!controls || !enabled) return

        const speed = isCtrlPressed ? 20 : 10 // Faster with Ctrl (or Shift?) usually Shift. User used Ctrl for Dolly mode, sticking to simple speed.
        // Actually, let's use Ctrl for speed boost if not conflicting? 
        // Current config uses Ctrl+LeftClick for Dolly.
        // WASD usage:
        const moveSpeed = speed * delta

        if (keys.current.w) controls.forward(moveSpeed, true)
        if (keys.current.s) controls.forward(-moveSpeed, true)
        if (keys.current.d) controls.truck(moveSpeed, 0, true)
        if (keys.current.a) controls.truck(-moveSpeed, 0, true)
    })

    return (
        <CameraControls
            ref={cameraControlsRef}
            enabled={enabled}
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            azimuthRotateSpeed={sensitivity.rotate}
            polarRotateSpeed={sensitivity.rotate}
            dollySpeed={sensitivity.dolly}
            truckSpeed={sensitivity.truck}
            dollyToCursor={zoomToCursor}
            minDistance={0.1}
            maxDistance={Infinity}
            mouseButtons={{
                left: isCtrlPressed ? 8 : 2, // 8=DOLLY (Ctrl+Click), 2=TRUCK (Pan)
                right: 1, // ACTION.ROTATE (Right Click Orbit) - CONFIRMED
                middle: 0, // ACTION.NONE
                wheel: 8 // ACTION.DOLLY
            }}
            touches={{
                one: 32, // ACTION.TOUCH_ROTATE
                two: 512, // ACTION.TOUCH_DOLLY_TRUCK
                three: 128 // ACTION.TOUCH_TRUCK
            }}
            smoothTime={0.2}
        />
    )
}

export function Scene() {
    const [controlsEnabled, setControlsEnabled] = useState(true)
    const projection = useCameraStore(state => state.projection)

    return (
        <div className="relative w-full h-full bg-zinc-950">
            <Canvas
                shadows
                camera={{ position: [10, -10, 8], fov: 45, up: [0, 0, 1] }}
                gl={{ antialias: true }}
                orthographic={projection === 'orthographic'}
            >
                <Suspense fallback={null}>
                    {/* Unified Group for Model + Anchors */}
                    {/* Rotate 90deg X to stand upright (Y-up to Z-up) */}
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <Model />
                    </group>
                    {/* Anchors stay in World Space (Z-up) to avoid double rotation */}
                    <Anchors />
                </Suspense>

                <CameraController enabled={controlsEnabled} />

                <GizmoHelper
                    alignment="bottom-right"
                    margin={[80, 80]}
                    renderPriority={1}
                >
                    <group
                        onPointerEnter={() => setControlsEnabled(false)}
                        onPointerLeave={() => setControlsEnabled(true)}
                    >
                        <GizmoViewcube
                            font="bold 24px Inter"
                            color="#18181b"
                            strokeColor="#eab308"
                            textColor="#ffffff"
                            hoverColor="#facc15"
                            opacity={0.9}
                            // Remapped for Z-up (Mapbox standard)
                            faces={['DIREITA', 'ESQUERDA', 'BAIXO', 'TOPO', 'FRENTE', 'TRÁS']}
                        />
                    </group>
                </GizmoHelper>

                {/* Eixos RGB (X=Red, Y=Green, Z=Blue) no canto inferior esquerdo */}
                <GizmoHelper alignment="bottom-left" margin={[80, 140]}>
                    <GizmoViewport
                        axisColors={['#ef4444', '#22c55e', '#3b82f6']}
                        labelColor="white"
                    />
                </GizmoHelper>

                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 10, 10]} intensity={1.2} castShadow />
                <hemisphereLight intensity={0.4} groundColor="#000000" />

                {/* Base Grid - XY Plane (Z-up) */}
                <gridHelper args={[100, 100, 0x444444, 0x222222]} rotation={[Math.PI / 2, 0, 0]} />
            </Canvas>
            <CameraSettingsPanel />
        </div>
    )
}
