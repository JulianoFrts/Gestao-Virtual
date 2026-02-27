import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Workflow,
  ArrowLeftRight,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Loader2,
  Maximize2,
  Minimize2,
  TowerControl as TowerIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tower } from '../types'

interface GeoViewerSidebarProps {
  isControlsCollapsed: boolean
  setIsControlsCollapsed: (collapsed: boolean) => void
  towerSearch: string
  setTowerSearch: (search: string) => void
  towerElevation: number
  setTowerElevation: (elevation: number) => void
  scale: number
  setScale: (scale: number) => void
  isConnectMode: boolean
  setIsConnectMode: (mode: boolean) => void
  isSwapMode: boolean
  setIsSwapMode: (mode: boolean) => void
  isSaving: boolean
  handleSave: () => void
  isFullScreen: boolean
  setIsFullScreen: (full: boolean) => void
  handleClearTowers: () => void
  handleFitToTowers: () => void
  towers: Tower[]
  hiddenTowerIds: Set<string>
  setHiddenTowerIds: (ids: Set<string>) => void
  onSelectTower?: (tower: Tower) => void
  isAutoConnect: boolean
  setIsAutoConnect: (val: boolean) => void
  isAutoStructure: boolean
  setIsAutoStructure: (val: boolean) => void
  canEdit?: boolean
  handleAutoConnectSequence?: () => void
  handleAutoStructure?: () => void
}

export const GeoViewerSidebar: React.FC<GeoViewerSidebarProps> = ({
  isControlsCollapsed,
  setIsControlsCollapsed,
  towerSearch,
  setTowerSearch,
  towerElevation,
  setTowerElevation,
  scale,
  setScale,
  isConnectMode,
  setIsConnectMode,
  isSwapMode,
  setIsSwapMode,
  isSaving,
  handleSave,
  isFullScreen,
  setIsFullScreen,
  handleClearTowers,
  handleFitToTowers,
  towers,
  hiddenTowerIds,
  setHiddenTowerIds,
  onSelectTower,
  canEdit,
  isAutoConnect,
  setIsAutoConnect,
  isAutoStructure,
  setIsAutoStructure,
  handleAutoConnectSequence,
  handleAutoStructure,
}) => {
  const filteredTowers = towers.filter(t => {
    const searchLow = (towerSearch || '').toLowerCase()
    const nameMatch = (t.name || '').toLowerCase().includes(searchLow)
    const idMatch = (t.id || '').toLowerCase().includes(searchLow)
    return nameMatch || idMatch
  })

  const toggleVisibility = (towerId: string) => {
    const next = new Set(hiddenTowerIds)
    if (next.has(towerId)) next.delete(towerId)
    else next.add(towerId)
    setHiddenTowerIds(next)
  }

  return (
    <div
      className={cn(
        'absolute top-20 left-6 z-10 flex flex-col transition-all duration-500 ease-in-out',
        isControlsCollapsed
          ? 'h-12 w-12 overflow-hidden'
          : 'h-[calc(100vh-120px)] w-80'
      )}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 rounded-xl p-2">
              <Zap className="text-primary h-5 w-5" />
            </div>
            {!isControlsCollapsed && (
              <h2 className="text-sm font-black tracking-tighter uppercase">
                Controles 3D
              </h2>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className={cn(
              'h-10 w-10 shrink-0 p-0 hover:bg-white/10',
              isControlsCollapsed
                ? 'absolute inset-1 rounded-2xl bg-black/60 shadow-xl'
                : 'rounded-lg'
            )}
          >
            {isControlsCollapsed ? (
              <div className="flex h-full w-full flex-col items-center justify-center pt-1.5 pr-0.5">
                <Zap className="text-primary mb-1 h-5 w-5 animate-pulse" />
              </div>
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!isControlsCollapsed && (
          <div className="animate-in fade-in slide-in-from-top-4 flex min-h-0 flex-1 flex-col space-y-6 duration-500">
            {/* Busca */}
            <div className="relative shrink-0">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Buscar torre..."
                value={towerSearch}
                onChange={e => setTowerSearch(e.target.value)}
                className="focus:border-primary/50 h-10 rounded-xl border-white/10 bg-white/5 pl-10 text-xs"
              />
            </div>

            {/* Ajustes Gerais */}
            <div className="shrink-0 space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black tracking-widest text-white/40 uppercase">
                  <span>Elevação Torres</span>
                  <span className="text-primary">{towerElevation}m</span>
                </div>
                <Slider
                  value={[towerElevation]}
                  min={0}
                  max={20}
                  step={0.5}
                  onValueChange={([val]) => setTowerElevation(val)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black tracking-widest text-white/40 uppercase">
                  <span>Escala Vertical</span>
                  <span className="text-primary">{scale}%</span>
                </div>
                <Slider
                  value={[scale]}
                  min={10}
                  max={200}
                  onValueChange={([val]) => setScale(val)}
                />
              </div>
            </div>

            {/* Listagem de Torres */}
            <div className="flex min-h-0 flex-1 flex-col border-t border-white/5 pt-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase">
                  Lista de Torres ({filteredTowers.length})
                </h3>
              </div>
              <ScrollArea className="-mx-2 flex-1 px-2">
                <div className="space-y-1">
                  {filteredTowers.map(tower => {
                    const isHidden = hiddenTowerIds.has(tower.id)
                    return (
                      <div
                        key={tower.id}
                        className={cn(
                          'group flex items-center justify-between rounded-xl p-2 transition-all hover:bg-white/5',
                          isHidden && 'opacity-40'
                        )}
                      >
                        <button
                          onClick={() => onSelectTower?.(tower)}
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          <div
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                              isHidden
                                ? 'bg-white/5'
                                : 'bg-primary/10 group-hover:bg-primary/20'
                            )}
                          >
                            <TowerIcon
                              className={cn(
                                'h-3.5 w-3.5',
                                isHidden ? 'text-white/40' : 'text-primary'
                              )}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-white/80 transition-colors group-hover:text-white">
                            {tower.name}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(tower.id)}
                          className="h-7 w-7 rounded-lg hover:bg-white/10"
                        >
                          {isHidden ? (
                            <EyeOff className="h-3.5 w-3.5 text-red-400" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 text-white/40" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                  {filteredTowers.length === 0 && (
                    <div className="py-8 text-center text-[10px] font-black text-white/20 uppercase">
                      Nenhuma torre encontrada
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Ferramentas de Edição e Ações de Sistema */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-white/5 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={isConnectMode ? 'default' : 'secondary'}
                  onClick={() => {
                    setIsConnectMode(!isConnectMode)
                    setIsSwapMode(false)
                  }}
                  className="h-10 gap-2 rounded-xl text-[10px] font-black tracking-wider uppercase"
                >
                  <Workflow className="h-3.5 w-3.5" />
                  Conectar
                </Button>
                <Button
                  variant={isSwapMode ? 'default' : 'secondary'}
                  onClick={() => {
                    setIsSwapMode(!isSwapMode)
                    setIsConnectMode(false)
                  }}
                  className="h-10 gap-2 rounded-xl text-[10px] font-black tracking-wider uppercase"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Trocar
                </Button>
                <Button
                  variant={isAutoConnect ? 'default' : 'secondary'}
                  disabled={!canEdit}
                  onClick={() => setIsAutoConnect(!isAutoConnect)}
                  className={cn(
                    'h-10 gap-2 rounded-xl text-[10px] font-black tracking-wider uppercase',
                    isAutoConnect &&
                      'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:bg-orange-400'
                  )}
                >
                  <Workflow className="h-3.5 w-3.5" />
                  Auto-Seq
                </Button>
                <Button
                  variant={isAutoStructure ? 'default' : 'secondary'}
                  disabled={!canEdit}
                  onClick={() => setIsAutoStructure(!isAutoStructure)}
                  className={cn(
                    'h-10 gap-2 rounded-xl text-[10px] font-black tracking-wider uppercase',
                    isAutoStructure &&
                      'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:bg-orange-400'
                  )}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Auto-Str
                </Button>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="shadow-primary/20 h-11 w-full gap-3 rounded-xl font-black tracking-widest uppercase shadow-lg"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Layout
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={handleFitToTowers}
                  className="h-10 gap-2 rounded-xl text-[10px] font-black tracking-wider uppercase"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Centralizar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="h-10 gap-2 rounded-xl text-[10px] font-black tracking-wider uppercase"
                >
                  {isFullScreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                  {isFullScreen ? 'Janela' : 'Full'}
                </Button>
              </div>

              <Button
                variant="destructive"
                onClick={handleClearTowers}
                disabled={towers.length === 0}
                className="h-10 w-full gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-[10px] font-black tracking-widest text-red-500 uppercase hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar Tudo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
