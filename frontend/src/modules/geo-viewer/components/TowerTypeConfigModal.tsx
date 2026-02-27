import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TowerTypeConfig } from '../hooks/useProjectConfig'
import { Tower } from '../types/geo-viewer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Save, Settings2 } from 'lucide-react'

interface TowerTypeConfigModalProps {
  isOpen: boolean
  onClose: () => void
  towers: Tower[]
  configs: TowerTypeConfig[]
  onSave: (configs: TowerTypeConfig[]) => void
}

export function TowerTypeConfigModal({
  isOpen,
  onClose,
  towers,
  configs,
  onSave,
}: TowerTypeConfigModalProps) {
  const [localConfigs, setLocalConfigs] = useState<TowerTypeConfig[]>([])

  // Get unique tower types from current towers
  const towerTypes = Array.from(new Set(towers.map(t => t.type || 'ESTAIADA')))

  useEffect(() => {
    if (isOpen) {
      // Initialize local configs with existing or defaults for all current types
      const initial = towerTypes.map(type => {
        const existing = configs.find(c => c.type === type)
        return (
          existing || {
            type,
            scale: 0,
            elevation: 4,
            modelUrl: '',
          }
        )
      })
      setLocalConfigs(initial)
    }
  }, [isOpen, towers, configs])

  const handleUpdate = (
    type: string,
    field: keyof TowerTypeConfig,
    value: any
  ) => {
    setLocalConfigs(prev =>
      prev.map(c => (c.type === type ? { ...c, [field]: value } : c))
    )
  }

  const handleSave = () => {
    onSave(localConfigs)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-4xl border-white/10 bg-neutral-950 p-0">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter text-white uppercase italic">
            <Settings2 className="h-6 w-6 text-emerald-500" />
            Configuração por Tipo
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-8 py-4">
          <div className="space-y-6">
            {localConfigs.map(config => (
              <div
                key={config.type}
                className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black tracking-widest text-emerald-400 uppercase">
                    Tipo: {config.type}
                  </h3>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                      Offset Escala
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: +10 ou -5"
                      value={config.scale}
                      onChange={e =>
                        handleUpdate(
                          config.type,
                          'scale',
                          Number(e.target.value)
                        )
                      }
                      className="h-12 border-none bg-black/40 text-[11px] font-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                      Elevação (m)
                    </Label>
                    <Input
                      type="number"
                      value={config.elevation}
                      onChange={e =>
                        handleUpdate(
                          config.type,
                          'elevation',
                          Number(e.target.value)
                        )
                      }
                      className="h-12 border-none bg-black/40 text-[11px] font-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                      URL do Modelo 3D (Opcional)
                    </Label>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdate(
                          config.type,
                          'modelUrl',
                          'INTERNAL_DEFAULT'
                        )
                      }
                      className="text-[9px] font-black tracking-widest text-emerald-500 uppercase transition-colors hover:text-emerald-400"
                    >
                      Usar Padrão
                    </button>
                  </div>
                  <Input
                    placeholder="https://.../model.glb"
                    value={
                      config.modelUrl === 'INTERNAL_DEFAULT'
                        ? 'PADRÃO INTERNO'
                        : config.modelUrl || ''
                    }
                    onChange={e =>
                      handleUpdate(config.type, 'modelUrl', e.target.value)
                    }
                    readOnly={config.modelUrl === 'INTERNAL_DEFAULT'}
                    className="h-12 border-none bg-black/40 text-[11px] font-black"
                  />
                </div>
              </div>
            ))}

            {localConfigs.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <p className="text-xs font-black uppercase italic">
                  Nenhum tipo de torre detectado
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="bg-black/40 p-8 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-12 px-8 text-xs font-black tracking-widest text-neutral-400 uppercase hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="h-12 gap-3 rounded-2xl bg-emerald-500 px-8 font-black tracking-widest text-black uppercase hover:bg-emerald-400"
          >
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
