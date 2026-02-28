import { useState, useEffect, useCallback } from 'react'
import { orionApi } from '@/integrations/orion/client'
import { useToast } from '@/hooks/use-toast'
import { PhaseConfig } from '@/components/map/CableConfigModal'
import { Tower } from '../types/geo-viewer'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface TowerTypeConfig {
  type: string
  scale: number
  elevation: number
  modelUrl?: string
  structure?: 'portico' | 'suspension' | 'anchor' | ''
  category?: 'estaiada' | 'autoportante' | ''
}

export interface ProjectConfig {
  scale: number
  towerElevation: number
  phases: PhaseConfig[]
  connections: { from: string; to: string }[]
  hiddenTowerIds: string[]
  towerTypeConfigs?: TowerTypeConfig[]
  individualAltitudes?: Record<string, number>
}

export function useProjectConfig(DEFAULT_PHASES: PhaseConfig[]) {
  const { toast: showToast } = useToast()
  const queryClient = useQueryClient()
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => {
      const saved = localStorage.getItem('gapo_project_id')
      return saved && saved !== 'undefined' ? saved : null
    }
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // Configuration State
  const [scale, setScale] = useState<number>(50)
  const [towerElevation, setTowerElevation] = useState<number>(30)
  const [phases, setPhases] = useState<PhaseConfig[]>(DEFAULT_PHASES)
  const [connections, setConnections] = useState<{ from: string; to: string }[]>([])
  const [hiddenTowerIds, setHiddenTowerIds] = useState<Set<string>>(new Set())
  const [individualAltitudes, setIndividualAltitudes] = useState<Record<string, number>>({})
  const [towerTypeConfigs, setTowerTypeConfigs] = useState<TowerTypeConfig[]>([])

  // 1. QUERY: Buscar lista de projetos (Monitorado pelo Devtools)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await orionApi
        .from('projects')
        .select('id, name, company_id')
        .order('name')
      if (error) throw error
      
      return (data as any[]).map(p => ({
        id: p.id,
        name: p.name,
        companyId: p.company_id
      }))
    }
  })

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('gapo_project_id', selectedProjectId)
    }
  }, [selectedProjectId])

  // 2. MUTATION: Salvamento de Configurações (Monitorado pelo Devtools)
  const saveMutation = useMutation({
    mutationFn: async ({ towers, overrides }: { towers: Tower[], overrides?: Partial<ProjectConfig> }) => {
      if (!selectedProjectId) return

      const finalScale = overrides?.scale ?? scale
      const finalTowerElevation = overrides?.towerElevation ?? towerElevation
      const finalTowerTypeConfigs = overrides?.towerTypeConfigs ?? towerTypeConfigs
      const finalPhases = overrides?.phases ?? phases
      const finalConnections = overrides?.connections ?? connections
      const finalHiddenTowerIds = overrides?.hiddenTowerIds ? Array.from(overrides.hiddenTowerIds) : Array.from(hiddenTowerIds)
      const finalIndividualAltitudes = overrides?.individualAltitudes ?? individualAltitudes

      const settingsPayload = {
        projectId: selectedProjectId,
        settings: {
          scale: finalScale,
          towerElevation: finalTowerElevation,
          phases: finalPhases,
          connections: finalConnections,
          hiddenTowerIds: finalHiddenTowerIds,
          towerTypeConfigs: finalTowerTypeConfigs,
          updatedAt: new Date().toISOString(),
        }
      }

      // Salvar Settings
      await orionApi.post('project_3d_cable_settings', settingsPayload)

      // Salvar Torres
      const currentProject = projects.find(p => p.id === selectedProjectId)
      const companyId = currentProject?.companyId || towers[0]?.companyId

      if (companyId && towers.length > 0) {
        const towersToUpdate = towers.map((t, index) => ({
          projectId: selectedProjectId,
          project_id: selectedProjectId,
          companyId: companyId,
          company_id: companyId,
          externalId: String(t.name),
          external_id: String(t.name),
          name: t.name,
          elementType: t.elementType || 'TOWER',
          element_type: t.elementType || 'TOWER',
          type: t.type,
          latitude: t.coordinates.lat,
          longitude: t.coordinates.lng,
          elevation: t.coordinates.altitude,
          sequence: index,
          displaySettings: {
            ...t.displaySettings,
            groundElevation: finalIndividualAltitudes[t.name],
          },
          metadata: { ...t.properties, ...t.metadata },
        }))

        const CHUNK_SIZE = 50
        for (let i = 0; i < towersToUpdate.length; i += CHUNK_SIZE) {
          await orionApi.post('map_elements', towersToUpdate.slice(i, i + CHUNK_SIZE))
        }
      }
      return { success: true }
    },
    onSuccess: () => {
      // Opcional: invalidar cache se necessário
    }
  })

  const loadProjectData = useCallback(
    async (
      projectId: string, 
      setTowers: (t: Tower[]) => void,
      setConnections: (c: { from: string; to: string }[]) => void
    ) => {
      if (!projectId || projectId === 'undefined') return

      setIsLoading(true)
      setIsDataLoaded(false)
      
      try {
        // A. Carregar map_elements
        const { data: mapData } = await orionApi
          .from('map_elements')
          .select('*')
          .eq('projectId', projectId)
          .order('sequence', { ascending: true })

        let towerData: any[] = mapData || []

        if (towerData.length === 0) {
          const { data: prodData } = await orionApi.get<any[]>('/production/tower-status', { projectId })
          towerData = (prodData as any)?.preview || (prodData as any)?.data || prodData || []
        }

        const uniqueTowersMap = new Map<string, Tower>()
        const restoredAlts: Record<string, number> = {}

        towerData.forEach((t: any, idx: number) => {
          const name = String(t.name || t.externalId || t.objectId || `T-${idx + 1}`).trim()
          if (uniqueTowersMap.has(name)) return

          uniqueTowersMap.set(name, {
            ...t,
            id: String(t.id || t.elementId || `virtual-${name}`),
            name,
            coordinates: {
              lat: Number(t.latitude ?? t.lat ?? 0),
              lng: Number(t.longitude ?? t.lng ?? 0),
              altitude: Number(t.elevation ?? t.altitude ?? 0),
            },
            type: String(t.towerType || t.type || (t.metadata as any)?.type || 'ESTAIADA'),
            elementType: String(t.elementType || t.element_type || 'TOWER'),
            metadata: t.metadata || t,
            activityStatuses: (t.activityStatuses || (t.metadata as any)?.activityStatuses || []) as any[],
          } as Tower)

          const displaySettings = t.displaySettings || {}
          if (displaySettings.groundElevation !== undefined) {
            restoredAlts[name] = displaySettings.groundElevation
          }
        })

        const finalTowers = Array.from(uniqueTowersMap.values())
        setTowers(finalTowers)
        setIndividualAltitudes(restoredAlts)

        // B. Carregar Settings (via orionApi direto para manter compatibilidade)
        const settingsResp = await orionApi.from('project_3d_cable_settings').select('settings').eq('projectId', projectId).maybeSingle()
        
        if (settingsResp.data?.settings) {
          const s = settingsResp.data.settings as any
          if (s.scale !== undefined) setScale(Number(s.scale))
          if (s.towerElevation !== undefined) setTowerElevation(Number(s.towerElevation))
          if (s.hiddenTowerIds) setHiddenTowerIds(new Set(s.hiddenTowerIds))
          if (s.connections) setConnections(s.connections)
          if (s.towerTypeConfigs) setTowerTypeConfigs(s.towerTypeConfigs)
          if (s.phases) setPhases(s.phases)
        }

      } catch (error) {
        console.error('Error loading project data:', error)
      } finally {
        setIsLoading(false)
        setIsDataLoaded(true)
      }
    },
    [DEFAULT_PHASES]
  )

  const handleSaveConfig = useCallback(
    async (towers: Tower[], isAuto = false, overrides?: Partial<ProjectConfig>) => {
      if (!selectedProjectId || selectedProjectId === 'undefined') return
      if (isAuto && (!isDataLoaded || isLoading)) return
      
      // Disparar mutação monitorada pelo React Query Devtools
      saveMutation.mutate({ towers, overrides })
    },
    [selectedProjectId, isDataLoaded, isLoading, saveMutation]
  )

  const handleClearTowers = async () => {
    if (!selectedProjectId) return
    setIsClearing(true)
    try {
      await orionApi.from('tower_technical_data').delete().eq('project_id', selectedProjectId)
      setConnections([])
      setHiddenTowerIds(new Set())
      setIndividualAltitudes({})
      showToast({ title: 'Torres Removidas', description: 'Todas as torres foram removidas.' })
      return true
    } catch (error) {
      showToast({ title: 'Erro', description: 'Falha ao remover.', variant: 'destructive' })
      return false
    } finally {
      setIsClearing(false)
    }
  }

  return {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
    isSaving: saveMutation.isPending, 
    isClearing,
    isDataLoaded,
    scale,
    setScale,
    towerElevation,
    setTowerElevation,
    phases,
    setPhases,
    connections,
    setConnections,
    hiddenTowerIds,
    setHiddenTowerIds,
    individualAltitudes,
    setIndividualAltitudes,
    towerTypeConfigs,
    setTowerTypeConfigs,
    loadProjectData,
    handleSaveConfig,
    handleClearTowers,
  }
}
