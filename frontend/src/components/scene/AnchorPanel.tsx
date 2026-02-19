import { Trash2, X, Download, Save, Upload } from 'lucide-react'
import { useAnchorStore } from '@/store/anchorStore'
import { Button } from '@/components/ui/button'
import { serializeAnchors, saveAnchors, loadTemplateAnchors, saveAsTemplate, STANDARD_PROJECT_ID } from '@/services/anchorService'
import { useState, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Copy, FileUp } from 'lucide-react'
import * as THREE from 'three'

interface AnchorPanelProps {
    context: {
        companyId: string
        projectId: string
        towerId: string
    }
}

export function AnchorPanel({ context }: AnchorPanelProps) {
    const anchors = useAnchorStore(s => s.anchors)
    const remove = useAnchorStore(s => s.removeAnchor)
    const clear = useAnchorStore(s => s.clearAnchors)
    const setAnchors = useAnchorStore(s => s.setAnchors)
    const updateName = useAnchorStore(s => s.updateAnchorName)
    const updateType = useAnchorStore(s => s.updateAnchorType)

    // Tower Sequencing (Reactive)
    const technicalKm = useAnchorStore(s => s.technicalKm)
    const technicalIndex = useAnchorStore(s => s.technicalIndex)
    const circuitId = useAnchorStore(s => s.circuitId)
    const setTechnicalKm = useAnchorStore(s => s.setTechnicalKm)
    const setTechnicalIndex = useAnchorStore(s => s.setTechnicalIndex)
    const setCircuitId = useAnchorStore(s => s.setCircuitId)

    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const baseAnchor = anchors.find(a => a.type === 'calibration_base')

    const handleExport = () => {
        const serialized = serializeAnchors(anchors)
        const data = JSON.stringify(serialized, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `anchors_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string
                const parsed = JSON.parse(content)

                // Handle both array format and wrapped format
                const anchorsArray = Array.isArray(parsed) ? parsed : parsed.anchors

                if (!Array.isArray(anchorsArray)) {
                    throw new Error('Formato inválido: esperado um array de âncoras')
                }

                // Convert to our internal format
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const importedAnchors = anchorsArray.map((a: Record<string, any>, idx: number) => ({
                    id: a.id || `imported-${idx}-${Date.now()}`,
                    name: a.name || a.label || `Anchor ${idx + 1}`,
                    type: a.type || 'cable_attach',
                    meshName: a.meshName || 'imported',
                    position: Array.isArray(a.position)
                        ? new THREE.Vector3(a.position[0], a.position[1], a.position[2])
                        : new THREE.Vector3(a.position.x, a.position.y, a.position.z),
                    normal: a.normal,
                    faceIndex: a.faceIndex,
                    createdAt: a.createdAt || new Date().toISOString()
                }))

                setAnchors(importedAnchors)

                toast({
                    title: "Importação Concluída",
                    description: `${importedAnchors.length} âncoras carregadas com sucesso.`,
                })
            } catch {
                toast({
                    title: "Erro na Importação",
                    description: "Arquivo JSON inválido ou formato incorreto.",
                    variant: "destructive"
                })
            }
        }
        reader.readAsText(file)

        // Reset input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSave = async () => {
        if (!context.companyId || !context.projectId || !context.towerId) {
            toast({
                title: "Erro de Contexto",
                description: "Faltam informações de Empresa, Obra ou Torre na URL.",
                variant: "destructive"
            })
            return
        }

        setIsSaving(true)
        try {
            await saveAnchors(context, anchors, {
                technicalKm,
                technicalIndex,
                circuitId
            })
            toast({
                title: "Configuração Salva",
                description: "As âncoras e sequência técnica foram persistidas globalmente.",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleLoadTemplate = async () => {
        if (!window.confirm('Isso substituirá todas as âncoras atuais pelo modelo padrão. Continuar?')) return

        try {
            const templateAnchors = await loadTemplateAnchors(context.towerId)

            // Regenerate IDs to ensure they are treated as new instances for this project
            const newAnchors = templateAnchors.map(a => ({
                ...a,
                id: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                companyId: context.companyId,
                projectId: context.projectId
            }))

            setAnchors(newAnchors)
            toast({
                title: "Modelo Carregado",
                description: "As âncoras padrão foram carregadas. Lembre-se de salvar para persistir neste projeto.",
            })
        } catch {
            toast({
                title: "Erro",
                description: "Não foi possível carregar o modelo padrão.",
                variant: "destructive"
            })
        }
    }

    const handleSaveAsTemplate = async () => {
        if (!window.confirm('ATENÇÃO: Isso atualizará o MODELO PADRÃO para todas as obras. Tem certeza?')) return

        setIsSaving(true)
        try {
            // Ensure we are sending clean anchors without project-specific IDs if possible, 
            // but the backend might handle ID generation. 
            // We pass the current anchors.
            await saveAsTemplate(context.towerId, anchors)
            toast({
                title: "Template Atualizado",
                description: "Esta configuração agora é o padrão para este tipo de torre.",
            })
        } catch {
            toast({
                title: "Erro ao Salvar Template",
                description: "Falha ao atualizar o modelo padrão.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const isTemplateContext = context.projectId === STANDARD_PROJECT_ID

    return (
        <div className="absolute top-6 right-6 bg-zinc-900/90 backdrop-blur-md text-white p-5 rounded-2xl w-80 shadow-2xl border border-white/10 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="font-black uppercase tracking-tighter text-lg">Anchors</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none">
                        {isTemplateContext ? 'EDITANDO TEMPLATE' : 'Configuração do Projeto'}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { if (window.confirm('Limpar todas as âncoras?')) clear() }} className="text-white/20 hover:text-red-500 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Seção de Topologia e Sequenciamento */}
            {!isTemplateContext && (
                <div className="bg-black/40 rounded-xl p-3 mb-4 border border-white/10 shadow-inner group">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-cyan-500/20 rounded">
                            <Save className="w-3 h-3 text-cyan-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Topologia da Linha</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] text-white/40 font-bold uppercase">Estrutura (KM/ÍNDICE)</span>
                            <div className="flex items-center gap-1.5 bg-black/20 rounded-lg p-1 border border-white/5 focus-within:border-cyan-500/30 transition-all">
                                <input
                                    type="number"
                                    value={technicalKm}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setTechnicalKm(parseInt(e.target.value) || 0)}
                                    className="w-full bg-transparent border-none text-[11px] font-mono text-center text-cyan-400 focus:outline-none focus:ring-0 p-0"
                                    placeholder="KM"
                                />
                                <span className="text-white/10 font-bold">/</span>
                                <input
                                    type="number"
                                    value={technicalIndex}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setTechnicalIndex(parseInt(e.target.value) || 0)}
                                    className="w-full bg-transparent border-none text-[11px] font-mono text-center text-cyan-400 focus:outline-none focus:ring-0 p-0"
                                    placeholder="IND"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] text-white/40 font-bold uppercase">Circuito ID</span>
                            <div className="flex items-center bg-black/20 rounded-lg p-1 h-[32px] border border-white/5 focus-within:border-cyan-500/30 transition-all">
                                <span className="text-[9px] text-white/20 font-black ml-1 mr-2 px-1 bg-white/5 rounded">C</span>
                                <input
                                    type="text"
                                    value={circuitId.replace(/^C/, '')}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setCircuitId(`C${e.target.value.toUpperCase().replace(/^C/, '')}`)}
                                    className="w-full bg-transparent border-none text-[11px] font-mono text-white focus:outline-none focus:ring-0 p-0"
                                    placeholder="1"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Controls */}
            {!isTemplateContext && (
                <div className="flex gap-2 mb-4 pb-4 border-b border-white/5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadTemplate}
                        className="flex-1 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-[9px] font-black uppercase tracking-widest h-8"
                    >
                        <Copy className="w-3 h-3 mr-2" />
                        Usar Padrão
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveAsTemplate}
                        className="w-8 px-0 text-white/20 hover:text-amber-500"
                        title="Salvar como Template (CUIDADO)"
                    >
                        <FileUp className="w-3 h-3" />
                    </Button>
                </div>
            )}
            <div className="mb-4 pb-4 border-b border-white/5">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        if (!window.confirm('Isso ajustará a escala das âncoras de 4.5x para 1.0x. Use apenas se as âncoras estiverem flutuando longe da torre. Continuar?')) return
                        const newAnchors = anchors.map(a => {
                            const pos = (a.position as THREE.Vector3).isVector3 ? (a.position as THREE.Vector3).clone() : new THREE.Vector3((a.position as unknown as number[])[0], (a.position as unknown as number[])[1], (a.position as unknown as number[])[2])
                            // Reverse the previous transformation: (World - Offset) / Scale
                            // Old Transform was: World = Local * 4.5 + [0, 4, 0]
                            // New Transform is: World = Local * 1 + [0, 0, 0]
                            // So to adapt Old World to New World:
                            // Local = (OldWorld - [0, 4, 0]) / 4.5
                            // NewWorld = Local
                            pos.sub(new THREE.Vector3(0, 4, 0)).divideScalar(4.5)
                            return { ...a, position: pos }
                        })
                        setAnchors(newAnchors)
                        toast({ title: "Escala Corrigida", description: "Âncoras ajustadas para escala 1.0x." })
                    }}
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest h-8"
                >
                    <Download className="w-3 h-3 mr-2 rotate-180" />
                    Corrigir Escala (4.5x → 1x)
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {anchors.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Nenhum anchor criado</p>
                        <p className="text-[9px] text-white/10">Clique no modelo para adicionar</p>
                    </div>
                ) : (
                    anchors.map(a => {
                        const posZ = (a.position as THREE.Vector3).z ?? (a.position as unknown as number[])[2]
                        const baseZ = baseAnchor ? ((baseAnchor.position as THREE.Vector3).z ?? (baseAnchor.position as unknown as number[])[2]) : 0
                        const relHeight = baseAnchor && a.id !== baseAnchor.id ? Math.abs(posZ - baseZ).toFixed(2) : null

                        return (
                            <div key={a.id} className="flex flex-col p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-white/20 transition-all gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col flex-1 mr-2">
                                        <input
                                            type="text"
                                            value={a.name ?? a.meshName ?? 'Mesh'}
                                            onChange={(e) => updateName(a.id, e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black uppercase text-cyan-400 leading-none mb-1 focus:outline-none focus:ring-0 w-full"
                                            placeholder="Nome do Ponto"
                                        />
                                        <span className="text-[9px] text-white/40 font-mono tracking-tighter">
                                            {((a.position as THREE.Vector3).x ?? (a.position as unknown as number[])[0])?.toFixed(2)},
                                            {((a.position as THREE.Vector3).y ?? (a.position as unknown as number[])[1])?.toFixed(2)},
                                            {((a.position as THREE.Vector3).z ?? (a.position as unknown as number[])[2])?.toFixed(2)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => remove(a.id)}
                                        className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                                    <select
                                        value={a.type || 'cable_attach'}
                                        onChange={(e) => updateType(a.id, e.target.value as 'cable_attach' | 'calibration_base' | 'accessory_mount')}
                                        className="bg-black/20 text-[9px] text-white/70 border border-white/10 rounded px-1.5 py-1 focus:outline-none focus:border-cyan-500/50 w-full uppercase font-bold"
                                    >
                                        <option value="cable_attach">Ponto de Fixação</option>
                                        <option value="calibration_base">Base (Ref. Altura)</option>
                                        <option value="accessory_mount">Acessório</option>
                                    </select>

                                    {relHeight && (
                                        <div className="whitespace-nowrap bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded text-[9px] font-bold border border-cyan-500/20">
                                            {relHeight}m
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-1 mt-1 border-t border-white/5 pt-2">
                                    {['x', 'y', 'z'].map((axis) => {
                                        // Safe access to vector components
                                        const vec = (a.position as THREE.Vector3).isVector3 
                                            ? (a.position as THREE.Vector3) 
                                            : new THREE.Vector3((a.position as unknown as number[])[0], (a.position as unknown as number[])[1], (a.position as unknown as number[])[2]);
                                        
                                        const val = vec[axis as 'x' | 'y' | 'z']?.toFixed(3);
                                        
                                        return (
                                            <div key={axis} className="flex items-center bg-black/20 rounded px-1">
                                                <span className="text-[8px] font-bold text-white/30 uppercase mr-1">{axis}</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={val}
                                                    onChange={(e) => {
                                                        // Garantir que estamos lidando com Vector3 para consistencia
                                                        const newPos = (a.position as THREE.Vector3).isVector3 ? (a.position as THREE.Vector3).clone() : new THREE.Vector3((a.position as unknown as number[])[0], (a.position as unknown as number[])[1], (a.position as unknown as number[])[2])
                                                        const v = parseFloat(e.target.value)

                                                        // Atualizar eixo correto
                                                        if (axis === 'x') newPos.x = v
                                                        if (axis === 'y') newPos.y = v
                                                        if (axis === 'z') newPos.z = v

                                                        useAnchorStore.getState().updateAnchorPosition(a.id, newPos)
                                                    }}
                                                    className="w-full bg-transparent border-none text-[9px] text-white font-mono focus:outline-none p-0 py-0.5"
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || anchors.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest h-10 shadow-glow-green flex items-center gap-2"
                >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Salvando...' : 'Aplicar Configuração'}
                </Button>

                <div className="flex gap-2">
                    <Button
                        onClick={handleExport}
                        variant="outline"
                        className="flex-1 border-white/10 hover:bg-white/5 text-white/60 font-black uppercase text-[10px] tracking-widest h-10 flex items-center gap-2"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Exportar
                    </Button>

                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="flex-1 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 font-black uppercase text-[10px] tracking-widest h-10 flex items-center gap-2"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Importar
                    </Button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                    />
                </div>
            </div>
        </div >
    )
}
