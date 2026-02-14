import { Vector3 } from 'three'

export interface Anchor {
    id: string
    name?: string
    position: Vector3
    normal?: Vector3
    faceIndex?: number
    meshName?: string
    type?: 'calibration_base' | 'cable_attach' | 'accessory_mount'
    metadata?: any
    createdAt: string
}
