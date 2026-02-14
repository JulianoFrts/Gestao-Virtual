import React from 'react'
import { Scene } from '@/components/scene/Scene'
import { AnchorPanel } from '@/components/scene/AnchorPanel'
import { Button } from '@/components/ui/button'
import { getAnchors, loadTemplateAnchors, STANDARD_PROJECT_ID } from '@/services/anchorService'
import { useToast } from '@/hooks/use-toast'
import { useAnchorStore } from '@/store/anchorStore'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Box, LayoutGrid, ArrowUp, ArrowDown, MoveRight, MoveLeft, Video, BoxSelect, ZoomIn, Target, MousePointer2 } from 'lucide-react'
import { useCameraStore, CameraView, ProjectionMode } from '@/store/useCameraStore'
import { cn } from '@/lib/utils'

export default function Viewer3D() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // Extract context from URL or from LocalStorage (if missing)
    const urlCId = searchParams.get('companyId')
    const urlPId = searchParams.get('projectId')
    const urlTId = searchParams.get('towerId')

    const [context, setContext] = React.useState({
        companyId: urlCId ?? 'default-company',
        projectId: urlPId ?? 'default-project',
        towerId: urlTId ?? 'default-tower'
    })

    // Init: Check Storage if URL is empty
    React.useEffect(() => {
        if (!urlCId || !urlPId) {
            const saved = localStorage.getItem('3d_lab_context')
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    setContext(current => ({
                        companyId: urlCId || parsed.companyId || 'default-company',
                        projectId: urlPId || parsed.projectId || 'default-project',
                        towerId: urlTId || parsed.towerId || 'default-tower'
                    }))
                } catch (e) {
                    console.error("Failed to parse saved context", e)
                }
            }
        }
    }, [urlCId, urlPId, urlTId])

    // Save to Storage when we have a valid context (not defaults)
    React.useEffect(() => {
        if (context.companyId && context.companyId !== 'default-company' &&
            context.projectId && context.projectId !== 'default-project' &&
            context.towerId && context.towerId !== 'default-tower') {

            localStorage.setItem('3d_lab_context', JSON.stringify({
                companyId: context.companyId,
                projectId: context.projectId,
                towerId: context.towerId
            }))
        }
    }, [context])

    const view = useCameraStore(state => state.view)
    const setView = useCameraStore(state => state.setView)
    const projection = useCameraStore(state => state.projection)
    const setProjection = useCameraStore(state => state.setProjection)
    const zoomToCursor = useCameraStore(state => state.zoomToCursor)
    const toggleZoomMode = useCameraStore(state => state.toggleZoomMode)
    const cameraPosition = useCameraStore(state => state.cameraPosition)
    const setCameraPosition = useCameraStore(state => state.setCameraPosition)
    const setAnchors = useAnchorStore(state => state.setAnchors)
    const [localCoords, setLocalCoords] = React.useState(cameraPosition)
    const [isEditingCoords, setIsEditingCoords] = React.useState(false)

    // Sync store -> local when not editing
    React.useEffect(() => {
        if (!isEditingCoords) {
            setLocalCoords(cameraPosition)
        }
    }, [cameraPosition, isEditingCoords])

    const handleCoordChange = (axis: 'x' | 'y' | 'z', value: string) => {
        setLocalCoords(prev => ({ ...prev, [axis]: parseFloat(value) || 0 }))
    }

    const commitCoordChange = () => {
        setCameraPosition(localCoords)
        setIsEditingCoords(false)
    }

    // Load anchors on mount
    React.useEffect(() => {
        const loadAnchors = async () => {
            if (context.companyId && context.projectId && context.towerId) {
                try {
                    // 1. Try to load specific anchors for this project
                    const result = await getAnchors(context)

                    // Always load sequencing metadata if available
                    useAnchorStore.getState().setTechnicalKm(result.technicalKm)
                    useAnchorStore.getState().setTechnicalIndex(result.technicalIndex)
                    useAnchorStore.getState().setCircuitId(result.circuitId)

                    if (result.anchors && result.anchors.length > 0) {
                        useAnchorStore.getState().setAnchors(result.anchors)
                    }
                    // 2. If no anchors found and we are NOT editing the template itself, try loading the standard template
                    else if (context.projectId !== STANDARD_PROJECT_ID) {
                        try {
                            const templateAnchors = await loadTemplateAnchors(context.towerId)
                            if (templateAnchors && templateAnchors.length > 0) {
                                // Regenerate IDs for new project instances
                                const newAnchors = templateAnchors.map(a => ({
                                    ...a,
                                    id: `auto-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    companyId: context.companyId,
                                    projectId: context.projectId
                                }))
                                useAnchorStore.getState().setAnchors(newAnchors)
                                // Optional: Notify user
                                // toast({ title: "Template Padrão", description: "Carregado automaticamente." })
                            }
                        } catch (tmplErr) {
                            console.log("No template found or error loading template", tmplErr)
                        }
                    }
                } catch (err) {
                    console.error("Failed to load anchors", err)
                }
            }
        }
        loadAnchors()
    }, [context.companyId, context.projectId, context.towerId])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            commitCoordChange()
                ; (e.currentTarget as HTMLInputElement).blur()
        }
    }

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none" />

            {/* Header UI */}
            <div className="absolute top-6 left-6 z-10 flex items-center gap-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl h-12 w-12 p-0 text-white/60 hover:text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-cyan-500/20 rounded-md">
                            <Box className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tighter text-white">3D Anchor Lab</h1>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 leading-none">Configuração Técnica de Pontos de Fixação</p>
                </div>
            </div>

            {/* Camera Controls Toolbar */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
                    {[
                        { id: 'perspective', label: '3D', icon: LayoutGrid },
                        { id: 'top', label: 'Topo', icon: ArrowUp },
                        { id: 'front', label: 'Frente', icon: ArrowDown },
                        { id: 'right', label: 'Direita', icon: MoveRight },
                        { id: 'left', label: 'Esquerda', icon: MoveLeft },
                    ].map((cam) => (
                        <Button
                            key={cam.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => setView(cam.id as CameraView)}
                            className={cn(
                                "flex items-center gap-2 h-9 px-4 rounded-xl transition-all duration-300",
                                "text-[10px] font-black uppercase tracking-widest",
                                view === cam.id
                                    ? "bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <cam.icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{cam.label}</span>
                        </Button>
                    ))}
                </div>

                {/* Secondary Controls (Projection & Zoom Mode) */}
                <div className="flex items-center gap-2 bg-black/20 backdrop-blur-lg border border-white/5 p-1 rounded-xl shadow-lg">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProjection(projection === 'perspective' ? 'orthographic' : 'perspective')}
                        className={cn(
                            "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider gap-2",
                            projection === 'orthographic' ? "text-primary bg-primary/10" : "text-white/40 hover:text-white"
                        )}
                        title={projection === 'perspective' ? "Mudar para Projeção Ortográfica" : "Mudar para Projeção Perspectiva"}
                    >
                        <BoxSelect className="w-3 h-3" />
                        {projection === 'perspective' ? 'Perspectiva' : 'Ortográfica'}
                    </Button>

                    <div className="w-px h-4 bg-white/5" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleZoomMode()}
                        className={cn(
                            "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider gap-2",
                            zoomToCursor ? "text-primary bg-primary/10" : "text-white/40 hover:text-white"
                        )}
                        title={zoomToCursor ? "Zoom foca no Mouse" : "Zoom foca no Centro"}
                    >
                        {zoomToCursor ? <MousePointer2 className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                        {zoomToCursor ? 'Zoom Mouse' : 'Zoom Centro'}
                    </Button>
                </div>
            </div>

            {/* Camera Coordinates Panel */}
            <div className="absolute top-6 left-[calc(50%+240px)] z-10 hidden md:flex items-center gap-1.5 bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl h-[44px]">
                {(['x', 'y', 'z'] as const).map(axis => (
                    <div key={axis} className={cn(
                        "flex items-center bg-black/20 rounded-lg px-2 h-full border border-white/5 transition-colors group",
                        axis === 'x' && "focus-within:border-red-500/50",
                        axis === 'y' && "focus-within:border-green-500/50",
                        axis === 'z' && "focus-within:border-blue-500/50"
                    )}>
                        <span className={cn(
                            "text-[10px] font-black mr-1.5 uppercase",
                            axis === 'x' && "text-red-500",
                            axis === 'y' && "text-green-500",
                            axis === 'z' && "text-blue-500"
                        )}>{axis}</span>
                        <input
                            type="number"
                            step="0.5"
                            value={localCoords ? localCoords[axis].toFixed(2) : '0.00'}
                            onFocus={() => setIsEditingCoords(true)}
                            onBlur={commitCoordChange}
                            onChange={(e) => handleCoordChange(axis, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    commitCoordChange();
                                    (e.currentTarget as HTMLInputElement).blur()
                                }
                            }}
                            className="bg-transparent border-none text-xs font-bold text-white w-12 text-center focus:outline-none"
                        />
                    </div>
                ))}
            </div>

            {/* Main 3D Canvas */}
            <Scene />

            {/* Stats UI (Optional) */}
            <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 pointer-events-none">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Modelo Ativo</span>
                    <span className="text-xs font-black text-white">TOWER_SCENE_001.GLTF</span>
                </div>
                <div className="w-px h-6 bg-white/10 mx-2" />
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Status</span>
                    <span className="text-xs font-black text-green-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        RENDERIZANDO
                    </span>
                </div>
            </div>

            {/* Anchor List Panel */}
            <AnchorPanel context={context} />
        </div>
    )
}
