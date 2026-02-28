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
import { Save, Settings2, Plus, Trash2 } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface TowerTypeConfigModalProps {
  isOpen: boolean
  onClose: () => void
  towers: Tower[]
  configs: TowerTypeConfig[]
  onSave: (configs: TowerTypeConfig[]) => void
}

const PREDEFINED_TYPES = [
  'PORT', 'MSCAT', 'KD12A2', 'KD2AT', 'KD2SL', 'KD12AE', 
  'KD2SP', 'KD12A1', 'KD2A1V', 'KD12EM', 'KD2EP', 'KD2TR'
]

export function TowerTypeConfigModal({
  isOpen,
  onClose,
  towers,
  configs,
  onSave,
}: TowerTypeConfigModalProps) {
  const [localConfigs, setLocalConfigs] = useState<TowerTypeConfig[]>([])

  useEffect(() => {
    if (isOpen) {
      // Initialize with existing configs
      let initial = [...configs]
      
      // Auto-detect types from existing towers in the map that aren't in configs yet
      const currentTowerTypes = Array.from(new Set(towers.map(t => t.type).filter(Boolean))) as string[]
      
      currentTowerTypes.forEach(type => {
        if (!initial.find(c => c.type === type)) {
          initial.push({
            type,
            scale: 0,
            elevation: 4,
            modelUrl: '',
            structure: type === 'PORT' ? 'portico' : '',
            category: ''
          })
        }
      })
      
      setLocalConfigs(initial)
    }
  }, [isOpen, towers, configs])

  const handleUpdate = (type: string, field: keyof TowerTypeConfig, value: any) => {
    setLocalConfigs(prev =>
      prev.map(c => {
        if (c.type === type) {
          const updated = { ...c, [field]: value }
          // Business Rule: PORT is always portico
          if (updated.type === 'PORT') {
            updated.structure = 'portico'
          }
          return updated
        }
        return c
      })
    )
  }

  const handleAddType = (type: string) => {
    if (!localConfigs.find(c => c.type === type)) {
      setLocalConfigs(prev => [
        {
          type,
          scale: 0,
          elevation: 4,
          modelUrl: '',
          structure: type === 'PORT' ? 'portico' : '',
          category: ''
        },
        ...prev
      ])
    }
  }

  const handleRemoveType = (type: string) => {
    setLocalConfigs(prev => prev.filter(c => c.type !== type))
  }

  const handleSave = () => {
    onSave(localConfigs)
    onClose()
  }

  const availableTypesToAdd = PREDEFINED_TYPES.filter(pt => !localConfigs.some(lc => lc.type === pt))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl overflow-hidden rounded-4xl border-white/10 bg-neutral-950 p-0">
        <DialogHeader className="p-8 pb-4 border-b border-white/5">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter text-white uppercase italic">
            <Settings2 className="h-6 w-6 text-emerald-500" />
            Catálogo de Estruturas
          </DialogTitle>
        </DialogHeader>

        <div className="px-8 py-4 bg-white/2 border-b border-white/5">
          <Label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase mb-3 block">
            Adicionar Tipo Padrão ao Catálogo
          </Label>
          <div className="flex flex-wrap gap-2">
            {availableTypesToAdd.length > 0 ? (
              availableTypesToAdd.map(pt => (
                <Button
                  key={pt}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddType(pt)}
                  className="h-8 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-[9px] font-black text-emerald-500 hover:bg-emerald-500/20 uppercase"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {pt}
                </Button>
              ))
            ) : (
              <span className="text-xs text-neutral-500 italic">Todos os tipos padrão já foram adicionados.</span>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] px-8 py-4">
          {localConfigs.length > 0 ? (
            <Accordion type="multiple" className="space-y-3">
              {localConfigs.map(config => (
                <AccordionItem
                  key={config.type}
                  value={config.type}
                  className="rounded-2xl border border-white/5 bg-white/2 px-1 data-[state=open]:bg-white/5 transition-colors"
                >
                  <AccordionTrigger className="px-4 py-4 hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <span className="text-sm font-black tracking-widest text-emerald-400 uppercase w-24">
                        {config.type}
                      </span>
                      <div className="flex gap-2">
                        {config.structure && (
                          <span className="px-2 py-0.5 rounded-md bg-white/10 text-[8px] font-bold uppercase text-slate-300">
                            {config.structure}
                          </span>
                        )}
                        {config.category && (
                          <span className="px-2 py-0.5 rounded-md bg-white/10 text-[8px] font-bold uppercase text-slate-300">
                            {config.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-4 pb-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Lado Esquerdo: Ajustes 3D */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">
                            URL do Modelo 3D (.GLB / .GLTF)
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://.../model.glb ou .gltf"
                              value={config.modelUrl === 'INTERNAL_DEFAULT' ? 'PADRÃO INTERNO' : (config.modelUrl || '')}
                              onChange={e => handleUpdate(config.type, 'modelUrl', e.target.value)}
                              readOnly={config.modelUrl === 'INTERNAL_DEFAULT'}
                              className="h-10 border-none bg-black/40 text-[10px] font-black"
                            />
                            <Button 
                              variant="outline" 
                              className="h-10 text-[8px] font-black uppercase tracking-widest border-white/10"
                              onClick={() => handleUpdate(config.type, 'modelUrl', 'INTERNAL_DEFAULT')}
                            >
                              Padrão
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">
                              Offset Escala (3D)
                            </Label>
                            <Input
                              type="number"
                              placeholder="Ex: +10 ou -5"
                              value={config.scale}
                              onChange={e => handleUpdate(config.type, 'scale', Number(e.target.value))}
                              className="h-10 border-none bg-black/40 text-[11px] font-black"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">
                              Elevação Base (m)
                            </Label>
                            <Input
                              type="number"
                              value={config.elevation}
                              onChange={e => handleUpdate(config.type, 'elevation', Number(e.target.value))}
                              className="h-10 border-none bg-black/40 text-[11px] font-black"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Classificação Engenharia */}
                      <div className="space-y-4 border-l border-white/5 pl-6">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">
                            Tipo de Estrutura
                          </Label>
                          <Select 
                            value={config.structure || undefined} 
                            onValueChange={(val) => handleUpdate(config.type, 'structure', val)}
                            disabled={config.type === 'PORT'} // Regra de negócio
                          >
                            <SelectTrigger className={cn("h-10 border-none bg-black/40 text-[10px] font-black uppercase", config.type === 'PORT' && "opacity-50")}>
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10">
                              <SelectItem value="portico">Pórtico (PORTICO)</SelectItem>
                              <SelectItem value="suspension" disabled={config.type === 'PORT'}>Suspensão (SUSPENSION)</SelectItem>
                              <SelectItem value="anchor" disabled={config.type === 'PORT'}>Ancoragem (ANCHOR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">
                            Categoria / Autoportabilidade
                          </Label>
                          <Select 
                            value={config.category || undefined} 
                            onValueChange={(val) => handleUpdate(config.type, 'category', val)}
                          >
                            <SelectTrigger className="h-10 border-none bg-black/40 text-[10px] font-black uppercase">
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10">
                              <SelectItem value="estaiada">Estaiada</SelectItem>
                              <SelectItem value="autoportante">Autoportante</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="pt-4 flex justify-end">
                           <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveType(config.type)}
                            className="h-8 text-[9px] font-black text-red-500 hover:text-red-400 hover:bg-red-500/10 uppercase tracking-widest"
                          >
                            <Trash2 className="w-3 h-3 mr-2" /> Remover do Catálogo
                          </Button>
                        </div>
                      </div>

                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="py-20 text-center opacity-40 flex flex-col items-center">
              <Settings2 className="w-12 h-12 mb-4 text-emerald-500 opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest">
                Catálogo Vazio
              </p>
              <p className="text-[10px] text-neutral-400 mt-2">
                Adicione tipos utilizando os botões acima ou eles serão auto-detectados das torres no mapa.
              </p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="bg-black/40 p-8 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                {localConfigs.length} Tipos no Catálogo
            </span>
            <div className="flex gap-3">
                <Button
                    variant="ghost"
                    onClick={onClose}
                    className="h-12 px-8 text-xs font-black tracking-widest text-neutral-400 uppercase hover:text-white"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    className="h-12 gap-3 rounded-2xl bg-emerald-500 px-8 font-black tracking-widest text-black uppercase hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                    <Save className="h-4 w-4" />
                    Salvar Catálogo
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
