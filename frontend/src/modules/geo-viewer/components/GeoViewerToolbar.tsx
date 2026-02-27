import React from 'react'
import { Button } from '@/components/ui/button'
import {
  List,
  Layers,
  Zap,
  RefreshCw,
  Maximize2,
  Link2,
  Workflow,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GeoViewerToolbarProps {
  showTowerMenu: boolean
  toggleTowerMenu: () => void
  showTypeMenu: boolean
  toggleTypeMenu: () => void
  showCableMenu: boolean
  toggleCableMenu: () => void
  canSeeExecutivePanel: boolean
  selectedProjectId: string | null
  handleSelectTowerFromModal: (id: string) => void
  hiddenTowerIds: Set<string>
  setHiddenTowerIds: (ids: Set<string>) => void
  handleSnapToTerrain: (a: boolean, b: boolean) => void
  handleAutoRotateTowers: () => void
  handleFitToTowers: () => void
  isConnectMode: boolean
  setIsConnectMode: (mode: boolean) => void
  isSwapMode: boolean
  setIsSwapMode: (mode: boolean) => void
  canEdit: boolean
  handleAutoConnectSequence: () => void
  handleAutoStructure: () => void
  isFullScreen: boolean
}

export const GeoViewerToolbar: React.FC<GeoViewerToolbarProps> = ({
  showTowerMenu,
  toggleTowerMenu,
  showTypeMenu,
  toggleTypeMenu,
  showCableMenu,
  toggleCableMenu,
  canSeeExecutivePanel,
  selectedProjectId,
  handleSelectTowerFromModal,
  hiddenTowerIds,
  setHiddenTowerIds,
  handleSnapToTerrain,
  handleAutoRotateTowers,
  handleFitToTowers,
  isConnectMode,
  setIsConnectMode,
  isSwapMode,
  setIsSwapMode,
  canEdit,
  handleAutoConnectSequence,
  handleAutoStructure,
  isFullScreen,
}) => {
  return (
    <div
      className={cn(
        'fixed bottom-10 left-1/2 -translate-x-1/2 transition-all duration-500',
        isFullScreen ? 'z-60' : 'z-50'
      )}
    >
      <div className="flex items-center gap-3 rounded-4xl border border-white/10 bg-black/80 p-2.5 shadow-2xl backdrop-blur-3xl">
        <div className="flex items-center gap-2 rounded-3xl border border-white/5 bg-white/5 p-1.5">
          <Button
            variant="ghost"
            className={cn(
              'h-11 gap-3 rounded-2xl px-6 text-[10px] font-black tracking-widest uppercase transition-all',
              showTowerMenu
                ? 'bg-emerald-500 text-black shadow-lg'
                : 'text-neutral-400 hover:text-emerald-400'
            )}
            onClick={toggleTowerMenu}
          >
            <List className="h-4 w-4" />
            <span>Torres</span>
          </Button>

          <Button
            variant="ghost"
            className={cn(
              'h-11 gap-3 rounded-2xl px-6 text-[10px] font-black tracking-widest uppercase transition-all',
              showTypeMenu
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-neutral-400 hover:text-blue-400'
            )}
            onClick={toggleTypeMenu}
          >
            <Layers className="h-4 w-4" />
            <span>Tipos</span>
          </Button>

          <Button
            variant="ghost"
            className={cn(
              'h-11 gap-3 rounded-2xl px-6 text-[10px] font-black tracking-widest uppercase transition-all',
              showCableMenu
                ? 'bg-cyan-500 text-black shadow-lg'
                : 'text-neutral-400 hover:text-cyan-400'
            )}
            onClick={toggleCableMenu}
          >
            <Zap className="h-4 w-4" />
            <span>Cabos</span>
          </Button>

          <div className="mx-1 h-8 w-px bg-white/10" />
        </div>

        <div className="mx-1 h-8 w-px bg-white/10" />

        <div className="flex items-center gap-1.5">
          {[
            {
              icon: RefreshCw,
              label: 'Snap',
              onClick: () => handleSnapToTerrain(false, true),
              color: 'text-orange-400',
            },
            {
              icon: RefreshCw,
              label: 'Rotate',
              onClick: () => handleAutoRotateTowers(),
              color: 'text-blue-400',
            },
            {
              icon: Maximize2,
              label: 'Fit',
              onClick: () => handleFitToTowers(),
              color: 'text-emerald-400',
            },
            {
              icon: Link2,
              label: 'Connect',
              active: isConnectMode,
              onClick: () => {
                if (!canEdit) return
                setIsConnectMode(!isConnectMode)
                setIsSwapMode(false)
              },
              color: 'text-orange-500',
              disabled: !canEdit,
            },
          ].map((tool, idx) => (
            <Button
              key={idx}
              variant="ghost"
              disabled={tool.disabled}
              className={cn(
                'h-11 gap-2.5 rounded-2xl border border-transparent px-4 text-[10px] font-black tracking-widest uppercase transition-all',
                tool.active
                  ? 'border-white/10 bg-white/10 shadow-inner'
                  : 'text-neutral-500 hover:border-white/5 hover:bg-white/5',
                tool.disabled && 'cursor-not-allowed opacity-20 grayscale'
              )}
              onClick={tool.onClick}
            >
              <tool.icon className={cn('h-4.5 w-4.5', tool.color)} />
              <span className="hidden md:inline-block">{tool.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
