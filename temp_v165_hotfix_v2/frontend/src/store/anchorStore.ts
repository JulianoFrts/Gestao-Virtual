import { create } from 'zustand'
import { Anchor } from '../types/anchor'

interface AnchorState {
    anchors: Anchor[]
    addAnchor: (anchor: Anchor) => void
    setAnchors: (anchors: Anchor[]) => void
    removeAnchor: (id: string) => void
    updateAnchorName: (id: string, name: string) => void
    updateAnchorType: (id: string, type: Anchor['type']) => void
    updateAnchorPosition: (id: string, position: Anchor['position']) => void
    clearAnchors: () => void

    // Tower Sequencing
    technicalKm: number
    technicalIndex: number
    circuitId: string
    setTechnicalKm: (km: number) => void
    setTechnicalIndex: (index: number) => void
    setCircuitId: (id: string) => void
}

export const useAnchorStore = create<AnchorState>((set) => ({
    anchors: [],
    addAnchor: (anchor) =>
        set((state) => ({ anchors: [...state.anchors, anchor] })),
    setAnchors: (anchors) => set({ anchors }),
    removeAnchor: (id) =>
        set((state) => ({
            anchors: state.anchors.filter(a => a.id !== id)
        })),
    updateAnchorName: (id, name) =>
        set((state) => ({
            anchors: state.anchors.map(a => a.id === id ? { ...a, name } : a)
        })),
    updateAnchorType: (id, type) =>
        set((state) => ({
            anchors: state.anchors.map(a => a.id === id ? { ...a, type } : a)
        })),
    updateAnchorPosition: (id, position) =>
        set((state) => ({
            anchors: state.anchors.map(a => a.id === id ? { ...a, position } : a)
        })),
    clearAnchors: () => set({ anchors: [] }),

    // Tower Sequencing
    technicalKm: 221,
    technicalIndex: 441,
    circuitId: 'C1',
    setTechnicalKm: (technicalKm) => set({ technicalKm }),
    setTechnicalIndex: (technicalIndex) => set({ technicalIndex }),
    setCircuitId: (circuitId) => set({ circuitId })
}))
