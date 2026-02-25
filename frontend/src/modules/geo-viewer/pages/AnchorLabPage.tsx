import React from 'react'
import { Scene } from '@/components/scene/Scene'
import { AnchorPanel } from '@/components/scene/AnchorPanel'
import { Button } from '@/components/ui/button'
import { getAnchors, loadTemplateAnchors, STANDARD_PROJECT_ID } from '@/services/anchorService'
import { useAnchorStore } from '@/store/anchorStore'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Box, LayoutGrid, ArrowUp, ArrowDown, MoveRight, MoveLeft, BoxSelect, Target, MousePointer2 } from 'lucide-react'
import { useCameraStore, CameraView } from '@/store/useCameraStore'
import { cn } from '@/lib/utils'

export default function AnchorLabPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const urlCId = searchParams.get('companyId')
    const urlPId = searchParams.get('projectId')
    const urlTId = searchParams.get('towerId')

    const [context, setContext] = React.useState({
        companyId: urlCId ?? 'default-company',
        projectId: urlPId ?? 'default-project',
        towerId: urlTId ?? 'default-tower'
    })

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
                } catch (e) { console.error(e) }
            }
        }
    }, [urlCId, urlPId, urlTId])

    React.useEffect(() => {
        if (context.companyId !== 'default-company') {
            localStorage.setItem('3d_lab_context', JSON.stringify(context))
        }
    }, [context])

    const { view, setView, projection, setProjection, zoomToCursor, toggleZoomMode, cameraPosition, setCameraPosition } = useCameraStore()
    const [localCoords, setLocalCoords] = React.useState(cameraPosition)
    const [isEditingCoords, setIsEditingCoords] = React.useState(false)

    React.useEffect(() => { if (!isEditingCoords) setLocalCoords(cameraPosition) }, [cameraPosition, isEditingCoords])

    const commitCoordChange = () => { setCameraPosition(localCoords); setIsEditingCoords(false) }

    React.useEffect(() => {
        const load = async () => {
            if (context.companyId && context.projectId && context.towerId) {
                try {
                    const result = await getAnchors(context)
                    useAnchorStore.getState().setTechnicalKm(result.technicalKm)
                    if (result.anchors?.length > 0) useAnchorStore.getState().setAnchors(result.anchors)
                } catch (e) { console.error(e) }
            }
        }
        load()
    }, [context])

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans">
            <div className="absolute top-6 left-6 z-10 flex items-center gap-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="bg-white/5 border border-white/10 rounded-2xl h-12 w-12 p-0 text-white/60">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Box className="w-3.5 h-3.5 text-cyan-400" />
                        <h1 className="text-xl font-black uppercase text-white">3D Anchor Lab</h1>
                    </div>
                </div>
            </div>

            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
                    {[
                        { id: 'perspective', label: '3D', icon: LayoutGrid },
                        { id: 'top', label: 'Topo', icon: ArrowUp },
                        { id: 'front', label: 'Frente', icon: ArrowDown },
                    ].map((cam) => (
                        <Button key={cam.id} variant="ghost" size="sm" onClick={() => setView(cam.id as CameraView)} className={cn("h-9 px-4 rounded-xl", view === cam.id ? "bg-primary text-white" : "text-white/40")}>
                            <cam.icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline ml-2">{cam.label}</span>
                        </Button>
                    ))}
                </div>
            </div>

            <Scene />
            <AnchorPanel context={context} />
        </div>
    )
}
