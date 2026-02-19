import { Anchor } from '@/types/anchor'

export function AnchorMarker({ anchor }: { anchor: Anchor }) {
    const type = anchor.type || 'cable_attach'

    // Configurações visuais por tipo
    // Configurações visuais por tipo
    const config = {
        cable_attach: { color: "#ef4444", geometry: "sphere", scale: 0.04 }, // Reduzido para escala 1.0 (era 0.15)
        calibration_base: { color: "#3b82f6", geometry: "box", scale: 0.05 }, // Reduzido para escala 1.0 (era 0.20)
        accessory_mount: { color: "#eab308", geometry: "cone", scale: 0.05 }  // Reduzido para escala 1.0 (era 0.18)
    }

    const { color, geometry, scale } = config[type]

    return (
        <mesh position={anchor.position}>
            {geometry === 'sphere' && <sphereGeometry args={[scale, 16, 16]} />}
            {geometry === 'box' && <boxGeometry args={[scale, scale, scale]} />}
            {geometry === 'cone' && <coneGeometry args={[scale, scale * 2, 16]} />}
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
    )
}
