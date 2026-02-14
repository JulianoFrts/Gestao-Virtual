import { create } from 'zustand'

export type CameraView = 'perspective' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'
export type ProjectionMode = 'perspective' | 'orthographic'

interface CameraState {
    view: CameraView
    projection: ProjectionMode
    zoomToCursor: boolean
    controlMode: 'orbit' | 'fps'
    cameraPosition: { x: number, y: number, z: number }
    sensitivity: {
        rotate: number
        dolly: number
        truck: number
    }
    setView: (view: CameraView) => void
    setProjection: (mode: ProjectionMode) => void
    setControlMode: (mode: 'orbit' | 'fps') => void
    toggleZoomMode: () => void
    setCameraPosition: (pos: { x: number, y: number, z: number }) => void
    setSensitivity: (sensitivity: Partial<{ rotate: number, dolly: number, truck: number }>) => void
}

export const useCameraStore = create<CameraState>((set) => ({
    view: 'perspective',
    projection: 'perspective',
    zoomToCursor: true,
    cameraPosition: { x: 10, y: -10, z: 8 },
    controlMode: 'orbit',
    sensitivity: {
        rotate: 0.3,
        dolly: 0.5,
        truck: 0.5,
    },
    setControlMode: (mode: 'orbit' | 'fps') => set({ controlMode: mode }),
    setView: (view) => set({ view }),
    setProjection: (mode) => set({ projection: mode }),
    toggleZoomMode: () => set((state) => ({ zoomToCursor: !state.zoomToCursor })),
    setCameraPosition: (pos) => set({ cameraPosition: pos }),
    setSensitivity: (sens) => set((state) => ({
        sensitivity: { ...state.sensitivity, ...sens }
    })),
}))
