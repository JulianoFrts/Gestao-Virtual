import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map as ReactMap, MapRef, Source } from 'react-map-gl/mapbox'
import { AmbientLight, DirectionalLight, LightingEffect } from '@deck.gl/core'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { useControl } from 'react-map-gl/mapbox'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/AuthContext'

import { GeoViewerLayout } from '../components/GeoViewerLayout'
import { GeoViewerFilters } from '../components/GeoViewerFilters'
import { GeoViewerCacheCleaner } from '../components/GeoViewerCacheCleaner'
import { GeoViewerCoords } from '../components/GeoViewerCoords'
import { useProjectConfig } from '../hooks/useProjectConfig'
import { useMapLayers } from '../hooks/useMapLayers'
import { useProgressLayers } from '../hooks/useProgressLayers'
import { useModelScanner } from '../hooks/useModelScanner'
import { useBoundingBox } from '../hooks/useBoundingBox'
import { useMapInteractions } from '../hooks/useMapInteractions'
import { useSceneData } from '../hooks/useSceneData'
import { TowerTypeConfigModal } from '../components/TowerTypeConfigModal'
import { Tower } from '../types/geo-viewer'
import {
  DEFAULT_PHASES,
  MAPBOX_TOKEN,
  TOWER_MODEL_URL,
  INITIAL_VIEW_STATE,
} from '../constants/constants'

import { CableConfigModal } from '@/components/map/CableConfigModal'
import { TowerDetailsModals } from '@/components/map/TowerDetailsModals'
import { TowerExecutionHistoryModal } from '@/components/map/TowerExecutionHistoryModal'
import { CompletedWorkModal } from '@/modules/geo-viewer/components/CompletedWorkModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  RefreshCw,
  Maximize2,
  Link2,
  Info,
  Navigation,
  X,
  Save,
  Loader2,
  Minimize2,
  List,
  Zap,
  Settings2,
  ArrowLeftRight,
  Filter,
  Activity,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import 'mapbox-gl/dist/mapbox-gl.css'

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 2.2,
})
const dirLight = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 2.5,
  direction: [-1, -2, -3],
})
const rimLight = new DirectionalLight({
  color: [200, 220, 255],
  intensity: 1.5,
  direction: [1, 2, 1],
})
const lightingEffect = new LightingEffect({ ambientLight, dirLight, rimLight })

function DeckGLOverlay(props: any): null {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ ...props, effects: [lightingEffect] }) as any
  )
  useEffect(() => {
    if (overlay) overlay.setProps({ ...props, effects: [lightingEffect] })
  }, [props, overlay])
  return null
}

export default function GeoViewerPage() {
  const { can } = usePermissions()
  const canEdit = can('map.edit')
  const { profile } = useAuth()
  const navigate = useNavigate()
  const mapRef = useRef<MapRef | null>(null)

  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
  const [isFullScreen, setIsFullScreen] = useState(true)
  const [showTowerMenu, setShowTowerMenu] = useState(false)
  const [showCableMenu, setShowCableMenu] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    tower: Tower
  } | null>(null)

  const [selectedTowerForDetails, setSelectedTowerForDetails] =
    useState<Tower | null>(null)
  const [isExecutivePanelOpen, setIsExecutivePanelOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [isTowerModalOpen, setIsTowerModalOpen] = useState(false)
  const [selectedTowerForHistory] = useState<Tower | null>(null)
  const [isExecutionHistoryModalOpen, setIsExecutionHistoryModalOpen] =
    useState(false)
  const [isTowerTypeModalOpen, setIsTowerTypeModalOpen] = useState(false)
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)

  const handleStageToggle = (stageName: string) => {
    setSelectedStages((prev) =>
      prev.includes(stageName)
        ? prev.filter((s) => s !== stageName)
        : [...prev, stageName]
    )
  }

  const handleClearFilters = () => {
    setSelectedStages([])
  }

  const {
    towers,
    setTowers,
    towersRef,
    connections,
    setConnections,
    connectionsRef,
  } = useSceneData()

  const { scanModelNodes } = useModelScanner()
  const { activeBox, calculateBox } = useBoundingBox()

  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
    isSaving,
    towerTypeConfigs,
    setTowerTypeConfigs,
    setScale,
    setTowerElevation,
    handleSaveConfig,
    handleClearTowers,
    scale,
    towerElevation,
    phases,
    setPhases,
    hiddenTowerIds,
    setHiddenTowerIds,
    individualAltitudes,
    setIndividualAltitudes,
    isDataLoaded,
    loadProjectData,
  } = useProjectConfig(DEFAULT_PHASES)

  const {
    isConnectMode,
    setIsConnectMode,
    selectedStartTower,
    debugPoints,
    handleSnapToTerrain,
    handleAutoRotateTowers,
    handleTowerClick,
    isAutoConnecting,
    setIsAutoConnecting,
    isSwapMode,
    setIsSwapMode,
    selectedSwapTower,
  } = useMapInteractions({
    towers,
    setTowers,
    towersRef,
    connections,
    setConnections,
    connectionsRef,
    mapRef,
    towerElevation,
    individualAltitudes,
    setIndividualAltitudes,
    onSave: handleSaveConfig,
  })

  const { layers } = useMapLayers({
    towers,
    phases,
    connections,
    towerElevation,
    scale,
    individualAltitudes,
    hiddenTowers: new Set(),
    hiddenTowerIds,
    selectedStartTower,
    viewState,
    TOWER_MODEL_URL,
    handleTowerClick,
    setContextMenu,
    debugPoints,
    towerTypeConfigs,
    selectedSwapTower,
    selectedStages,
    onScanModel: (tower, info) => {
      scanModelNodes(tower, info)
      calculateBox(info)
    },
    selectedBox: activeBox,
  })

  const { progressLayers } = useProgressLayers({
    towers,
    towerTypeConfigs,
    scale,
    towerElevation,
    individualAltitudes,
    visible: true
  })

  const allLayers = useMemo(() => {
    // Se estiver carregando ou sem torres, limpa o mapa completamente
    if (isLoading || towers.length === 0) return []
    return [...layers, ...progressLayers]
  }, [layers, progressLayers, isLoading, towers.length])

  // KM-LT Calculation
  const totalKm = useMemo(() => {
    if (towers.length < 2) return 0
    let dist = 0
    for (let i = 0; i < towers.length - 1; i++) {
      const t1 = towers[i]
      const t2 = towers[i + 1]
      const lat1 = t1.coordinates.lat
      const lon1 = t1.coordinates.lng
      const lat2 = t2.coordinates.lat
      const lon2 = t2.coordinates.lng
      const R = 6371 // km
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLon = ((lon2 - lon1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      dist += R * c
    }
    return dist
  }, [towers])

  // Handlers
  const handleFitToTowers = useCallback(() => {
    if (towers.length === 0) return
    const lngs = towers.map(t => t.coordinates.lng)
    const lats = towers.map(t => t.coordinates.lat)
    const minLng = Math.min(...lngs),
      maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats)
    mapRef.current?.getMap().fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 80, duration: 2000 }
    )
  }, [towers])

  const handleSelectTowerFromModal = useCallback(
    (towerId: string) => {
      const foundTower = towers.find(
        t => t.id === towerId || t.name === towerId
      )
      if (!foundTower) return
      mapRef.current?.getMap().flyTo({
        center: [foundTower.coordinates.lng, foundTower.coordinates.lat],
        zoom: 18,
        pitch: 60,
        duration: 2000,
      })
      setSelectedTowerForDetails(foundTower)
      if (!isExecutivePanelOpen) setIsTowerModalOpen(true)
    },
    [towers, isExecutivePanelOpen]
  )

  const canSeeExecutivePanel =
    profile?.isSystemAdmin ||
    ['SUPER_ADMIN_GOD', 'HELPER_SYSTEM'].includes(profile?.role || '')

  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== 'undefined') {
      loadProjectData(selectedProjectId, setTowers, setConnections)
    }
  }, [selectedProjectId, loadProjectData, setTowers, setConnections])

  // Close context menu
  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  // Auto-Initialization Sequence
  useEffect(() => {
    if (!isLoading && towers.length > 0 && !isAutoSyncing) {
      const runInitialization = async () => {
        setIsAutoSyncing(true)
        
        // 1. Fly to first tower
        const firstTower = towers[0]
        if (mapRef.current) {
          mapRef.current.getMap().flyTo({
            center: [firstTower.coordinates.lng, firstTower.coordinates.lat],
            zoom: 18,
            pitch: 60,
            duration: 3000,
          })
          
          // Wait for fly animation
          await new Promise(resolve => setTimeout(resolve, 3500))
          
          // 2. Snap to Terrain & Auto Rotate
          handleSnapToTerrain(true, true) // Silent, Force All
          handleAutoRotateTowers(true)    // Silent
          
          setIsAutoSyncing(false)
        }
      }
      
      // Só executa uma vez por carregamento de projeto
      const hasInitialized = (window as any)._gv_init_proj === selectedProjectId
      if (!hasInitialized) {
        (window as any)._gv_init_proj = selectedProjectId
        runInitialization()
      }
    }
  }, [isLoading, towers, isAutoSyncing, handleSnapToTerrain, handleAutoRotateTowers, selectedProjectId])

  return (
    <GeoViewerLayout
      isLoading={isLoading || isAutoSyncing}
      isFullScreen={isFullScreen}
      statsOverlay={
        <GeoViewerCoords 
          lat={viewState.latitude} 
          lng={viewState.longitude} 
          zoom={viewState.zoom} 
        />
      }
      floatingToolbar={
        <div className="flex items-center gap-3 rounded-4xl border border-white/10 bg-black/80 p-2.5 shadow-2xl backdrop-blur-3xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTowerTypeModalOpen(true)}
            className="h-11 w-14 rounded-2xl border border-white/5 bg-white/5 p-0 text-emerald-500 hover:bg-white/10"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 rounded-3xl border border-white/5 bg-white/5 p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-11 gap-3 rounded-2xl px-6 text-[10px] font-black tracking-widest uppercase',
                isExecutivePanelOpen ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'text-neutral-400'
              )}
              onClick={() => setIsExecutivePanelOpen(!isExecutivePanelOpen)}
            >
              <Activity className="h-4 w-4" />
              <span>Executivo</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-11 gap-3 rounded-2xl px-6 text-[10px] font-black tracking-widest uppercase',
                isFiltersOpen ? 'bg-emerald-500 text-black' : 'text-neutral-400'
              )}
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </Button>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-11 gap-3 rounded-2xl px-6 text-[10px] font-black tracking-widest uppercase',
                showTowerMenu ? 'bg-emerald-500 text-black' : 'text-neutral-400'
              )}
              onClick={() => setShowTowerMenu(!showTowerMenu)}
            >
              <List className="h-4 w-4" />
              <span>Torres</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-11 gap-3 rounded-2xl px-6 text-[10px] font-black tracking-widest uppercase',
                showCableMenu ? 'bg-cyan-500 text-black' : 'text-neutral-400'
              )}
              onClick={() => setShowCableMenu(!showCableMenu)}
            >
              <Zap className="h-4 w-4" />
              <span>Cabos</span>
            </Button>
            {canSeeExecutivePanel && (
              <CompletedWorkModal
                projectId={selectedProjectId || undefined}
                onSelectTower={handleSelectTowerFromModal}
                open={isExecutivePanelOpen}
                onOpenChange={setIsExecutivePanelOpen}
                hiddenTowerIds={hiddenTowerIds}
                onHiddenTowerIdsChange={newHiddenIds => {
                  setHiddenTowerIds(newHiddenIds)
                }}
              />
            )}
          </div>
          <div className="mx-1 h-8 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSnapToTerrain(false, true)}
              className="h-11 gap-2.5 rounded-2xl text-[10px] font-black text-orange-400 uppercase"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Snap</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAutoRotateTowers()}
              className="h-11 gap-2.5 rounded-2xl text-[10px] font-black text-blue-400 uppercase"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Rotate</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFitToTowers}
              className="h-11 gap-2.5 rounded-2xl text-[10px] font-black text-emerald-400 uppercase"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Fit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (canEdit) {
                  setIsSwapMode(!isSwapMode)
                  if (!isSwapMode) {
                    setIsConnectMode(false)
                    setIsAutoConnecting(false)
                  }
                }
              }}
              className={cn(
                'h-11 gap-2.5 rounded-2xl text-[10px] font-black text-purple-400 uppercase',
                isSwapMode && 'bg-white/10'
              )}
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Swap</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (canEdit) {
                  setIsConnectMode(!isConnectMode)
                  if (!isConnectMode) setIsSwapMode(false)
                }
              }}
              className={cn(
                'h-11 gap-2.5 rounded-2xl text-[10px] font-black text-orange-500 uppercase',
                isConnectMode && 'bg-white/10'
              )}
            >
              <Link2 className="h-4 w-4" />
              <span>Connect</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (canEdit) {
                  setIsAutoConnecting(!isAutoConnecting)
                  if (!isAutoConnecting) setIsSwapMode(false)
                }
              }}
              className={cn(
                'h-11 gap-2.5 rounded-2xl text-[10px] font-black text-rose-500 uppercase',
                isAutoConnecting &&
                  'bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
              )}
            >
              <Zap
                className={cn('h-4 w-4', isAutoConnecting && 'animate-pulse')}
              />
              <span>Auto-Conn</span>
            </Button>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <GeoViewerCacheCleaner 
              projectId={selectedProjectId}
              onRefresh={() => loadProjectData(selectedProjectId!, setTowers, setConnections)}
            />
          </div>
        </div>
      }
      premiumHeader={
        <div className="fixed top-6 left-1/2 z-60 w-[95%] max-w-6xl -translate-x-1/2">
          <div className="flex items-center justify-between gap-8 rounded-[2.5rem] border border-white/10 bg-black/95 p-4 shadow-2xl backdrop-blur-3xl">
            <div className="flex items-center gap-6">
              <Select
                value={selectedProjectId || undefined}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="h-12 w-[200px] border-white/5 bg-white/5 text-xs font-black tracking-widest uppercase">
                  <SelectValue placeholder="SELECIONAR OPERAÇÃO" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setIsClearConfirmOpen(true)}
                className="h-10 border-red-900/50 bg-red-950/30 text-[10px] font-black text-red-400 uppercase"
              >
                Limpar Torres
              </Button>
              <Button
                onClick={() => setIsFullScreen(false)}
                variant="ghost"
                className="h-12 gap-3 text-[10px] font-black text-neutral-400 uppercase"
              >
                <Maximize2 className="h-5 w-5 text-emerald-500" />
                FECHAR COCKPIT
              </Button>
            </div>
            <Button
              size="lg"
              className="h-14 gap-5 rounded-4xl bg-emerald-500 font-black tracking-widest text-black hover:bg-emerald-400"
              onClick={() => handleSaveConfig(towers)}
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span>Salvar</span>
            </Button>
          </div>
        </div>
      }
      navigationPills={
        <div className="absolute top-6 right-0 left-0 z-50 flex justify-center px-6">
          <div className="flex items-center gap-4 rounded-full border border-white/10 bg-black/90 p-2 shadow-2xl backdrop-blur-3xl">
            <Select
              value={selectedProjectId || undefined}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger className="h-8 w-[200px] border-none bg-transparent text-[10px] font-black tracking-widest uppercase">
                <SelectValue placeholder="PROJETO" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="h-8 w-px bg-white/10" />
            <Button
              variant="ghost"
              className="h-9 text-[9px] font-black text-slate-400 uppercase"
              onClick={() => navigate('/dashboard')}
            >
              <Minimize2 className="mr-2 h-3.5 w-3.5" />
              FECHAR
            </Button>
            <Button
              className="h-9 bg-emerald-500 text-[9px] font-black text-black uppercase"
              onClick={() => handleSaveConfig(towers)}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              SALVAR
            </Button>
          </div>
        </div>
      }
      statsOverlay={
        <>
          <div className="pointer-events-none absolute bottom-16 left-10 flex gap-12 text-left z-40">
            <div>
              <p className="text-[10px] font-black text-neutral-500 uppercase">
                Torres
              </p>
              <h3 className="flex items-baseline gap-2 text-4xl font-black text-white italic">
                {towers.length}
                <span className="text-lg font-black text-emerald-500 not-italic">
                  UNITS / {totalKm.toFixed(2)} KM-LT
                </span>
              </h3>
            </div>
          </div>
          <GeoViewerCoords 
            lat={viewState.latitude} 
            lng={viewState.longitude} 
            zoom={viewState.zoom} 
          />
        </>
      }
      sideMenu={
        <>
          <GeoViewerFilters
            isOpen={isFiltersOpen}
            onClose={() => setIsFiltersOpen(false)}
            selectedStages={selectedStages}
            onStageToggle={handleStageToggle}
            onClearFilters={handleClearFilters}
          />
          {showTowerMenu && (
          <div className="fixed top-24 right-6 bottom-6 z-40 w-[380px] rounded-[2.5rem] border border-white/10 bg-black/80 p-8 shadow-2xl backdrop-blur-3xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">
                Estruturas
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>

            <div className="relative mb-6">
              <Input
                placeholder="BUSCAR..."
                value={towerSearch}
                onChange={e => setTowerSearch(e.target.value)}
                className="h-14 rounded-2xl border-none bg-white/5 px-6 text-[11px] font-black tracking-widest text-white uppercase placeholder:text-neutral-500 focus-visible:ring-emerald-500/20"
              />
            </div>

            {/* Ajustes Gerais Restaurados */}
            <div className="mb-8 space-y-6 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                    Elevação Geral
                  </span>
                  <span className="text-[11px] font-black text-emerald-500">
                    {towerElevation}m
                  </span>
                </div>
                <Slider
                  value={[towerElevation]}
                  min={0}
                  max={60}
                  step={0.5}
                  onValueChange={([val]) => setTowerElevation(val)}
                  className="py-2"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                    Escala Base
                  </span>
                  <span className="text-[11px] font-black text-emerald-500">
                    {scale}%
                  </span>
                </div>
                <Slider
                  value={[scale]}
                  min={10}
                  max={200}
                  step={1}
                  onValueChange={([val]) => setScale(val)}
                  className="py-2"
                />
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                Lista de Torres (
                {
                  towers.filter(t =>
                    t.name.toLowerCase().includes(towerSearch.toLowerCase())
                  ).length
                }
                )
              </h3>
            </div>

            <div className="custom-scrollbar h-[calc(100%-180px)] space-y-3 overflow-y-auto pr-2">
              {towers
                .filter(t =>
                  t.name.toLowerCase().includes(towerSearch.toLowerCase())
                )
                .map((t, i) => (
                  <div
                    key={i}
                    className="group flex cursor-pointer items-center justify-between rounded-3xl bg-neutral-900/60 p-5 transition-all hover:scale-[1.02] hover:bg-neutral-800/80 active:scale-[0.98]"
                    onClick={() => handleSelectTowerFromModal(t.name)}
                  >
                    <span className="text-sm font-black tracking-tight text-emerald-400">
                      {t.name}
                    </span>
                    <Navigation className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-white" />
                  </div>
                ))}
              {towers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <List className="mb-4 h-12 w-12" />
                  <p className="text-[10px] font-black tracking-widest uppercase">
                    Nenhuma Torre
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      }
    </>
  }
  contextMenu={
        contextMenu && (
          <div
            className="fixed z-100 min-w-[200px] rounded-2xl border border-white/10 bg-black/90 p-2 backdrop-blur-3xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <Button
              variant="ghost"
              className="w-full justify-start text-[10px] font-black text-emerald-400 uppercase"
              onClick={() => {
                setSelectedTowerForDetails(contextMenu.tower)
                setIsTowerModalOpen(true)
              }}
            >
              <Info className="mr-2 h-4 w-4" />
              Detalhes
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-[10px] font-black text-red-400 uppercase"
              onClick={() => setContextMenu(null)}
            >
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
          </div>
        )
      }
      modals={
        <>
          <CableConfigModal
            isOpen={showCableMenu}
            onClose={() => setShowCableMenu(false)}
            phases={phases}
            onUpdate={newPhases => {
              setPhases(newPhases)
              handleSaveConfig(towers, true, { phases: newPhases })
            }}
            readOnly={!canEdit}
          />
          <TowerDetailsModals
            isOpen={isTowerModalOpen}
            onClose={() => setIsTowerModalOpen(false)}
            tower={selectedTowerForDetails}
          />
          <TowerExecutionHistoryModal
            isOpen={isExecutionHistoryModalOpen}
            onClose={() => setIsExecutionHistoryModalOpen(false)}
            tower={selectedTowerForHistory}
            projectId={selectedProjectId}
          />
          <TowerTypeConfigModal
            isOpen={isTowerTypeModalOpen}
            onClose={() => setIsTowerTypeModalOpen(false)}
            towers={towers}
            configs={towerTypeConfigs}
            onSave={newConfigs => {
              // Primeiro atualizamos o estado local
              setTowerTypeConfigs(newConfigs)
              // Depois forçamos o salvamento no banco com os dados novos explicitamente
              handleSaveConfig(towers, true, { towerTypeConfigs: newConfigs })
            }}
          />
        </>
      }
    >
      <ReactMap
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        style={{ width: '100%', height: '100%' }}
        terrain={
          towers.length > 0
            ? { source: 'mapbox-dem', exaggeration: 1.5 }
            : undefined
        }
      >
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        <DeckGLOverlay layers={allLayers} />
      </ReactMap>
    </GeoViewerLayout>
  )
}
