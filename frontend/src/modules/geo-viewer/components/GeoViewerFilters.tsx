import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ACTIVITY_PRESETS } from '@/modules/production/constants/activityPresets'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GeoViewerFiltersProps {
  isOpen: boolean
  onClose: () => void
  selectedStages: string[]
  onStageToggle: (stageName: string) => void
  onClearFilters: () => void
}

export const GeoViewerFilters: React.FC<GeoViewerFiltersProps> = ({
  isOpen,
  onClose,
  selectedStages,
  onStageToggle,
  onClearFilters,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed top-24 left-6 bottom-6 z-40 w-[320px] rounded-[2.5rem] border border-white/10 bg-black/80 p-8 shadow-2xl backdrop-blur-3xl transition-all duration-500 animate-in fade-in slide-in-from-left-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-emerald-500" />
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">
            Filtros
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full hover:bg-white/10"
        >
          <X className="h-5 w-5 text-neutral-400" />
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between px-1">
        <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
          Filtrar por Etapa
        </span>
        {selectedStages.length > 0 && (
          <button
            onClick={onClearFilters}
            className="text-[9px] font-black text-emerald-500 uppercase hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      <ScrollArea className="h-[calc(100%-120px)] pr-4">
        <div className="space-y-6">
          {ACTIVITY_PRESETS.map((category) => (
            <div key={category.name} className="space-y-3">
              <h3 className="text-[11px] font-black tracking-tight text-emerald-500/70 uppercase">
                {category.name}
              </h3>
              <div className="space-y-2 ml-1">
                {category.activities.map((activity) => (
                  <div
                    key={activity.name}
                    className="flex items-center space-x-3 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10 cursor-pointer"
                    onClick={() => onStageToggle(activity.name)}
                  >
                    <Checkbox
                      id={activity.name}
                      checked={selectedStages.includes(activity.name)}
                      onCheckedChange={() => onStageToggle(activity.name)}
                      className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-black"
                    />
                    <Label
                      htmlFor={activity.name}
                      className={cn(
                        "text-[10px] font-bold tracking-wide cursor-pointer uppercase transition-colors",
                        selectedStages.includes(activity.name) ? "text-white" : "text-neutral-400"
                      )}
                    >
                      {activity.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
