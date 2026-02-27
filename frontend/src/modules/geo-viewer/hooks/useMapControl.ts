import { useState, useRef, useCallback, useEffect } from "react";
import { MapRef } from "react-map-gl/mapbox";
import { Tower } from "../types";

export const INITIAL_VIEW_STATE = {
  longitude: -51.9253, // Brazil Center-ish
  latitude: -14.235,
  zoom: 4,
  pitch: 45,
  bearing: 0,
};

export function useMapControl() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const viewStateRef = useRef(viewState);
  const mapRef = useRef<MapRef | null>(null);

  // Keep ref updated for event handlers without triggering re-effects
  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);

  const handleFitToTowers = useCallback((towers: Tower[]) => {
    if (towers.length === 0) return;

    const lngs = towers.map((t) => t.coordinates.lng);
    const lats = towers.map((t) => t.coordinates.lat);

    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const mapInstance = mapRef.current?.getMap();
    if (mapInstance) {
      mapInstance.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 100, duration: 2000 }
      );
    }
  }, []);

  const flyToTower = useCallback((tower: any) => {
    const mapInstance = mapRef.current?.getMap();
    if (!mapInstance || !tower) return;

    let lng = tower.coordinates?.lng ?? tower.lng ?? tower.longitude;
    let lat = tower.coordinates?.lat ?? tower.lat ?? tower.latitude;

    if (lng !== undefined && lat !== undefined) {
      const coords: [number, number] = [Number(lng), Number(lat)];
      
      // Zoom 21.5 no Mapbox equivale a aproximadamente 20-30 metros de altitude visual
      // mantendo o ponto de ancoragem no solo.
      mapInstance.flyTo({
        center: coords,
        zoom: 21.5, 
        pitch: 75, // Inclinação para ver a torre e o solo
        bearing: 0,
        duration: 2500,
        essential: true,
      });
    } else {
      console.warn("flyToTower: Coordenadas não encontradas", tower);
    }
  }, []);

  return {
    viewState,
    setViewState,
    viewStateRef,
    mapRef,
    handleFitToTowers,
    flyToTower,
  };
}
