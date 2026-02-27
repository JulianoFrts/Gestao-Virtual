import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Navigation,
  Info,
  Layers,
  Boxes,
  Ruler,
  ArrowUp,
} from 'lucide-react'
import { Tower } from '@/modules/geo-viewer/types'

interface TowerDetailsModalsProps {
  isOpen: boolean
  onClose: () => void
  tower: Tower
}

export function TowerDetailsModals({
  isOpen,
  onClose,
  tower,
}: TowerDetailsModalsProps): React.JSX.Element | null {
  if (!tower) return null

  const handleNavigate = () => {
    const { lat, lng } = tower.coordinates
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden rounded-3xl border border-white/5 bg-black/95 p-0 text-white shadow-2xl backdrop-blur-2xl sm:max-w-[360px]">
        {/* Header Decoration - Premium OrioN Style */}
        <div className="relative flex h-28 items-end overflow-hidden border-b border-white/5 bg-linear-to-br from-emerald-500/20 via-black to-black p-5">
          <div className="absolute -top-10 -right-10 h-40 w-40 animate-pulse rounded-full bg-emerald-500/10 blur-[80px]" />
          <div className="absolute top-4 right-4 flex gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-black tracking-widest text-emerald-400 uppercase"
            >
              TÉCNICO
            </Badge>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.3)]">
              <Boxes className="h-5 w-5 text-black" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-xl leading-none font-black tracking-tighter text-white uppercase italic">
                  {tower.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Detalhes técnicos da estrutura {tower.name}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md border border-white/5 bg-white/10 px-2 py-0.5 text-[9px] font-black tracking-[0.2em] text-emerald-400 uppercase">
                  ESTRUTURA #{tower.id?.slice(0, 6).toUpperCase() || 'NEW'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="group rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-500 hover:bg-white/10">
              <h4 className="mb-1 flex items-center gap-2 text-[9px] font-black tracking-widest text-neutral-500 uppercase">
                <Ruler className="h-3 w-3 text-emerald-500" /> Elevação
              </h4>
              <p className="text-xl font-black tracking-tighter text-white italic">
                {Number(
                  tower.coordinates.altitude || tower.elevation || 0
                ).toFixed(2)}
                <span className="ml-1 text-[10px] text-neutral-500 not-italic">
                  M
                </span>
              </p>
            </div>
            <div className="group rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-500 hover:bg-white/10">
              <h4 className="mb-1 flex items-center gap-2 text-[9px] font-black tracking-widest text-neutral-500 uppercase">
                <Layers className="h-3 w-3 text-emerald-500" /> Tipo de Torre
              </h4>
              <p className="text-xl leading-none font-black tracking-tighter text-white uppercase italic">
                {tower.type || 'N/A'}
              </p>
              {tower.towerFunction && (
                <div className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black tracking-widest text-emerald-400 uppercase">
                  {tower.towerFunction}
                </div>
              )}
            </div>
          </div>

          {/* Technical Stats - Altura */}
          <div className="group rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-500 hover:bg-white/10">
            <h4 className="mb-1 flex items-center gap-2 text-[9px] font-black tracking-widest text-neutral-500 uppercase">
              <ArrowUp className="h-3 w-3 text-emerald-500" /> Altura da Torre
            </h4>
            <p className="text-2xl font-black tracking-tighter text-white uppercase italic">
              {Number(tower.towerHeight || 0).toFixed(2)}
              <span className="ml-1 text-[10px] text-neutral-500 not-italic">
                M
              </span>
            </p>
          </div>

          {/* Coordinates Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase">
                Geolocalização
              </h4>
              <MapPin className="h-3 w-3 text-emerald-500" />
            </div>
            <div className="space-y-1 rounded-2xl border border-white/5 bg-black/40 p-1.5">
              {[
                { label: 'Latitude', val: tower.coordinates.lat.toFixed(7) },
                { label: 'Longitude', val: tower.coordinates.lng.toFixed(7) },
              ].map((coord, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-white/5 p-3 transition-all hover:bg-white/10"
                >
                  <span className="text-[9px] font-black tracking-widest text-neutral-400 uppercase">
                    {coord.label}
                  </span>
                  <span className="font-mono text-xs font-black tracking-tight text-emerald-400">
                    {coord.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button - Ultra Premium */}
          <Button
            onClick={handleNavigate}
            className="group relative h-12 w-full overflow-hidden rounded-xl bg-emerald-500 text-[9px] font-black tracking-widest text-black uppercase shadow-[0_15px_30px_rgba(16,185,129,0.2)] transition-all hover:scale-[1.02] hover:bg-emerald-400 active:scale-95"
          >
            <div className="absolute inset-0 translate-y-20 bg-white/20 transition-transform duration-500 group-hover:translate-y-0" />
            <span className="relative z-10 flex items-center gap-2">
              <Navigation className="h-4 w-4 transition-transform group-hover:rotate-12" />
              GPS: NAVEGADOR
            </span>
          </Button>

          <div className="flex items-center justify-center gap-2 pt-2 text-[9px] font-black tracking-widest text-neutral-600 uppercase">
            <Info className="h-3 w-3 text-emerald-500/50" /> Sincronizado via
            OrioN Cloud Layer
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
