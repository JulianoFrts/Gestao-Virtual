import React, { useState, useEffect } from 'react'
import { Navigation, Terrain } from 'lucide-react'

interface GeoViewerCoordsProps {
  lng: number
  lat: number
  zoom: number
}

export const GeoViewerCoords: React.FC<GeoViewerCoordsProps> = ({ lng, lat, zoom }) => {
  return (
    <div className="fixed top-6 right-6 z-40 flex flex-col gap-2 rounded-3xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3 px-1">
        <Navigation className="h-3 w-3 text-emerald-500 rotate-45" />
        <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase italic">
          Centro do Mapa
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-1">
        <div className="space-y-0.5">
          <span className="text-[8px] font-bold text-neutral-500 uppercase block">Latitude</span>
          <span className="text-[11px] font-black text-white tabular-nums">
            {lat.toFixed(6)}°
          </span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[8px] font-bold text-neutral-500 uppercase block">Longitude</span>
          <span className="text-[11px] font-black text-white tabular-nums">
            {lng.toFixed(6)}°
          </span>
        </div>
      </div>

      <div className="h-px w-full bg-white/5 my-1" />

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-black text-white uppercase tracking-tighter">
            Zoom {zoom.toFixed(1)}
          </span>
        </div>
        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
          ONLINE
        </span>
      </div>
    </div>
  )
}
