import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Layers,
  Minimize2,
  Save,
  Loader2,
  Maximize2,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GeoViewerHeaderProps {
  isFullScreen: boolean
  setIsFullScreen: (full: boolean) => void
  selectedProjectId: string | null
  setSelectedProjectId: (id: string) => void
  projects: { id: string; name: string }[]
  isSaving: boolean
  handleSaveConfig: (manual: boolean) => void
  canEdit: boolean
  canManage: boolean
  isClearing: boolean
  towersCount: number
  setIsClearConfirmOpen: (open: boolean) => void
  navigate: (path: string) => void
  viewState: { latitude: number; longitude: number; zoom: number }
  getTerrainElevation?: (lng: number, lat: number) => number
}

export const GeoViewerHeader: React.FC<GeoViewerHeaderProps> = ({
  isFullScreen,
  setIsFullScreen,
  selectedProjectId,
  setSelectedProjectId,
  projects,
  isSaving,
  handleSaveConfig,
  canEdit,
  canManage,
  isClearing,
  towersCount,
  setIsClearConfirmOpen,
  navigate,
  viewState,
  getTerrainElevation,
}) => {
  const currentElevation = getTerrainElevation
    ? getTerrainElevation(viewState.longitude, viewState.latitude)
    : 0

  if (isFullScreen) {
    return (
      <div className="animate-in fade-in slide-in-from-top-6 fixed top-6 left-1/2 z-60 w-[95%] max-w-6xl -translate-x-1/2 duration-700">
        <div className="group relative flex items-center justify-between gap-8 overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/95 p-4 shadow-[0_0_80px_rgba(16,185,129,0.3)] ring-1 ring-white/10 backdrop-blur-3xl">
          <div className="absolute top-0 left-0 h-px w-full -translate-x-full bg-linear-to-r from-transparent via-emerald-500/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <div className="flex items-center gap-6">
            <div className="flex shrink-0 items-center gap-4 border-r border-white/10 pr-8">
              <Select
                value={selectedProjectId || ''}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="h-12 w-[100px] rounded-2xl border-white/5 bg-white/5 text-xs font-black tracking-widest text-white uppercase transition-all hover:bg-white/10">
                  <SelectValue placeholder="OPERAÇÃO" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/10 bg-neutral-900 shadow-2xl">
                  {projects.map((p, idx) => (
                    <SelectItem
                      key={`fs-${p.id}-${idx}`}
                      value={p.id}
                      className="font-mono text-xs font-bold"
                    >
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="h-8 w-px bg-white/10" />
              {canManage ? (
                <Button
                  variant="outline"
                  disabled={
                    isClearing || !selectedProjectId || towersCount === 0
                  }
                  className="h-10 gap-2 rounded-xl border-red-900/50 bg-red-950/30 px-4 text-[10px] font-black tracking-widest text-red-400 uppercase hover:bg-red-900/50"
                  onClick={() => setIsClearConfirmOpen(true)}
                >
                  {isClearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Limpar Torres
                </Button>
              ) : (
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-dashed border-white/5 px-6 text-[8px] font-black tracking-widest text-neutral-700 uppercase">
                  Admin Restrito
                </div>
              )}
              <div className="h-8 w-px bg-white/10" />
              <Button
                onClick={() => setIsFullScreen(false)}
                variant="ghost"
                className="group flex h-12 items-center gap-3 rounded-2xl border border-white/10 px-6 text-[10px] font-black tracking-widest text-neutral-400 uppercase shadow-xl hover:bg-white/5 hover:text-white"
              >
                <Maximize2 className="h-5 w-5 text-emerald-500 transition-transform group-hover:scale-110" />
                <span>FECHAR COCKPIT</span>
              </Button>
            </div>
          </div>
          <div className="group relative shrink-0">
            <div className="absolute inset-0 rounded-4xl bg-emerald-500/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            <Button
              size="lg"
              className={cn(
                'relative h-14 gap-5 rounded-4xl border-2 border-emerald-400/20 px-10 text-[11px] font-black tracking-[0.4em] uppercase shadow-2xl transition-all active:scale-95',
                isSaving
                  ? 'cursor-wait bg-emerald-500/50'
                  : 'bg-emerald-500 text-black shadow-emerald-500/30 hover:bg-emerald-400',
                !canEdit && 'cursor-not-allowed opacity-20 grayscale'
              )}
              onClick={() => canEdit && handleSaveConfig(false)}
              disabled={!selectedProjectId || isSaving || !canEdit}
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span>{isSaving ? 'PROCESSANDO' : 'PUBLICAR PROJETO'}</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute top-6 right-0 left-0 z-50 flex items-center justify-center px-6">
      <div className="no-scrollbar pointer-events-auto flex max-w-full items-center gap-4 overflow-x-auto rounded-full border border-white/10 bg-black/90 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl">
        <div className="flex shrink-0 items-center gap-2 px-2">
          <Layers className="h-3.5 w-3.5 text-emerald-500/50" />
          <Select
            value={selectedProjectId || ''}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="h-8 w-[180px] rounded-full border-none bg-transparent px-0 text-left text-[10px] font-black tracking-widest text-white uppercase shadow-none hover:text-emerald-400 focus:ring-0 md:w-[240px]">
              <SelectValue placeholder="SELECIONE O PROJETO" />
            </SelectTrigger>
            <SelectContent className="min-w-[240px] rounded-2xl border-white/10 bg-black shadow-2xl">
              {projects.map((p, idx) => (
                <SelectItem
                  key={`std-${p.id}-${idx}`}
                  value={p.id}
                  className="py-2 font-mono text-[10px] font-bold"
                >
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-8 w-px shrink-0 bg-white/10" />
        <div className="flex shrink-0 items-center gap-2 pr-2">
          <Button
            variant="ghost"
            className="h-9 rounded-full border border-transparent px-4 text-[9px] font-black tracking-widest text-slate-400 uppercase hover:border-white/10 hover:bg-white/5 hover:text-white"
            onClick={() => navigate('/dashboard')}
          >
            <Minimize2 className="mr-2 h-3.5 w-3.5" />
            FECHAR COCKPIT
          </Button>
          <Button
            className={cn(
              'h-9 gap-2 rounded-full px-6 text-[9px] font-black tracking-widest uppercase shadow-lg transition-all',
              isSaving
                ? 'cursor-wait bg-emerald-500/50'
                : 'bg-emerald-500 text-black shadow-emerald-500/10 hover:bg-emerald-400 active:scale-95'
            )}
            onClick={() => canEdit && handleSaveConfig(false)}
            disabled={!selectedProjectId || isSaving || !canEdit}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>PUBLICAR</span>
          </Button>
          <div className="ml-3 flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-black tracking-widest text-emerald-400/70 uppercase">
                LAT
              </span>
              <span className="font-mono text-[10px] font-black text-white tabular-nums">
                {viewState.latitude.toFixed(6)}
              </span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-black tracking-widest text-emerald-400/70 uppercase">
                LNG
              </span>
              <span className="font-mono text-[10px] font-black text-white tabular-nums">
                {viewState.longitude.toFixed(6)}
              </span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-black tracking-widest text-emerald-400/70 uppercase">
                ELEVAÇÃO
              </span>
              <span className="font-mono text-[10px] font-black text-white tabular-nums">
                {currentElevation > 0
                  ? `${Math.round(currentElevation)}m`
                  : `${viewState.zoom.toFixed(1)}z`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
