import { create } from 'zustand';

interface GeoState {
    center: { lat: number; lng: number };
    zoom: number;
    setCenter: (lat: number, lng: number) => void;
    setZoom: (zoom: number) => void;
}

export const useGeoStore = create<GeoState>((set) => ({
    // Default START somewhere in Brazil (e.g., São Paulo)
    center: { lat: -23.55052, lng: -46.633309 },
    zoom: 16,
    setCenter: (lat, lng) => set({ center: { lat, lng } }),
    setZoom: (zoom) => set({ zoom }),
}));
