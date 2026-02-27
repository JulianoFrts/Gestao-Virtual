import { useState, useEffect, useCallback } from 'react'
import { orionApi } from '@/integrations/orion/client'
import { useToast } from '@/hooks/use-toast'
import { PhaseConfig } from '@/components/map/CableConfigModal'
import { Tower } from '../types/geo-viewer'

export interface TowerTypeConfig {
  type: string
  scale: number
  elevation: number
  modelUrl?: string
}

export interface ProjectConfig {
  scale: number
  towerElevation: number
  phases: PhaseConfig[]
  connections: { from: string; to: string }[]
  hiddenTowerIds: string[]
  towerTypeConfigs?: TowerTypeConfig[]
}

export function useProjectConfig(DEFAULT_PHASES: PhaseConfig[]) {
  const { toast: showToast } = useToast()
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => {
      const saved = localStorage.getItem('gapo_project_id')
      return saved && saved !== 'undefined' ? saved : null
    }
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // Configuration State
  const [scale, setScale] = useState<number>(50)
  const [towerElevation, setTowerElevation] = useState<number>(30)
  const [phases, setPhases] = useState<PhaseConfig[]>(() => {
    const saved = localStorage.getItem('orion-cable-config')
    return saved ? JSON.parse(saved) : DEFAULT_PHASES
  })
  const [connections, setConnections] = useState<
    { from: string; to: string }[]
  >([])
  const [hiddenTowerIds, setHiddenTowerIds] = useState<Set<string>>(new Set())
  const [individualAltitudes, setIndividualAltitudes] = useState<
    Record<string, number>
  >({})
  const [towerTypeConfigs, setTowerTypeConfigs] = useState<TowerTypeConfig[]>(
    []
  )

  // Fetch projects on mount
  useEffect(() => {
    let isMounted = true
    const fetchProjects = async () => {
      const { data, error } = await orionApi
        .from('projects')
        .select('id, name')
        .order('name')
      if (!error && data && isMounted) {
        const sortedProjects = data as { id: string; name: string }[]
        setProjects(sortedProjects)
        if (!selectedProjectId && sortedProjects.length > 0) {
          setSelectedProjectId(sortedProjects[0].id)
        }
      }
    }
    fetchProjects()
    return () => {
      isMounted = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('gapo_project_id', selectedProjectId)
    }
  }, [selectedProjectId])

  const loadProjectData = useCallback(
    async (projectId: string, setTowers: (t: Tower[]) => void) => {
      if (!projectId || projectId === 'undefined') return

      setIsLoading(true)
      setTowers([])
      setConnections([])
      setIndividualAltitudes({})
      setHiddenTowerIds(new Set())
      setPhases(DEFAULT_PHASES)
      setScale(50)
      setTowerElevation(4.0)
      setTowerTypeConfigs([])

      try {
        // 1. Load Towers from Production API
        const { data: towerData, error: towerError } = await orionApi.get<
          Record<string, unknown>[]
        >('/production/tower-status', { projectId })

        console.log('[DEBUG Cockpit3D API]', {
          projectId,
          towerData,
          towerError,
        })

        if (!towerError && towerData) {
          const tryUnwrap = (obj: any): any[] | null => {
            if (!obj) return null
            if (Array.isArray(obj)) return obj
            if (obj.preview && Array.isArray(obj.preview)) return obj.preview
            if (obj.data) return tryUnwrap(obj.data)
            return null
          }

          const unwrapped = tryUnwrap(towerData)
          if (unwrapped) {
            const mappedTowers = unwrapped.map((t: any, idx: number) => {
              const name = String(
                t.name || t.externalId || t.objectId || `T-${idx + 1}`
              )
              let rawLat = Number(t.latitude ?? t.lat ?? 0)
              let rawLng = Number(t.longitude ?? t.lng ?? 0)

              if (rawLat < -35 && rawLng > -35 && rawLng < 0) {
                const temp = rawLat
                rawLat = rawLng
                rawLng = temp
              }

              return {
                ...t,
                id: String(t.id || t.elementId || `virtual-${name}`),
                name,
                coordinates: {
                  lat: rawLat,
                  lng: rawLng,
                  altitude: Number(t.elevation ?? t.altitude ?? 0),
                },
                type: String(t.towerType || t.type || 'ESTAIADA'),
                elementType: String(t.elementType || 'TOWER'),
                metadata: t,
                activityStatuses: (t.activityStatuses ||
                  t.productionProgress ||
                  []) as any[],
              } as Tower
            })

            setTowers(mappedTowers)

            // Restore individual altitudes
            const restoredAlts: Record<string, number> = {}
            unwrapped.forEach((t: any) => {
              const displaySettings =
                (t.displaySettings as Record<string, any>) || {}
              if (displaySettings?.groundElevation) {
                restoredAlts[String(t.name || t.externalId)] =
                  displaySettings.groundElevation
              }
            })
            setIndividualAltitudes(restoredAlts)
          }
        }

        // 2. Load Global Settings
        const { data: settingsData } = await orionApi
          .from('project_3d_cable_settings')
          .select('settings')
          .eq('projectId', projectId)
          .maybeSingle()

        if (settingsData?.settings) {
          const s = settingsData.settings as Record<string, any>
          if (s.scale) setScale(s.scale)
          if (s.towerElevation) setTowerElevation(s.towerElevation)
          if (s.hiddenTowerIds) setHiddenTowerIds(new Set(s.hiddenTowerIds))
          if (s.phases) {
            const mergedPhases = DEFAULT_PHASES.map(def => {
              const loaded = s.phases.find((p: any) => p.id === def.id)
              return loaded ? { ...def, ...loaded } : def
            })
            setPhases(mergedPhases)
          }
          if (s.connections) setConnections(s.connections)
          if (s.towerTypeConfigs) setTowerTypeConfigs(s.towerTypeConfigs)
        }
      } catch (error) {
        console.error('Error loading project data:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [DEFAULT_PHASES]
  )

  const handleSaveConfig = useCallback(
    async (towers: Tower[], isAuto = false) => {
      if (!selectedProjectId || selectedProjectId === 'undefined') return
      setIsSaving(true)
      try {
        await orionApi.from('project_3d_cable_settings').upsert({
          projectId: selectedProjectId,
          settings: {
            scale,
            towerElevation,
            phases,
            connections,
            hiddenTowerIds: Array.from(hiddenTowerIds),
            towerTypeConfigs,
            updatedAt: new Date().toISOString(),
          },
        })

        const towersMap = new Map()
        towers.forEach((t, index) => {
          if (!t.name) return
          const entry = {
            projectId: selectedProjectId,
            externalId: String(t.name),
            name: t.name,
            elementType: t.elementType || 'TOWER',
            type: t.type,
            latitude: t.coordinates.lat,
            longitude: t.coordinates.lng,
            elevation: t.coordinates.altitude,
            sequence: index,
            displaySettings: {
              ...t.displaySettings,
              groundElevation: individualAltitudes[t.name],
            },
            metadata: { ...t.properties, ...t.metadata },
          }
          towersMap.set(entry.externalId, entry)
        })

        const towersToUpdate = Array.from(towersMap.values())
        if (towersToUpdate.length > 0) {
          const CHUNK_SIZE = 50
          for (let i = 0; i < towersToUpdate.length; i += CHUNK_SIZE) {
            await orionApi
              .from('map_elements')
              .insert(towersToUpdate.slice(i, i + CHUNK_SIZE))
          }
        }

        if (!isAuto) {
          showToast({
            title: 'Sucesso! 💾',
            description: 'Configurações da obra foram salvas.',
          })
        }
      } catch (error) {
        console.error('Save error:', error)
        if (!isAuto)
          showToast({
            title: 'Erro ao salvar',
            description: 'Não foi possível persistir os dados.',
            variant: 'destructive',
          })
      } finally {
        setIsSaving(false)
      }
    },
    [
      selectedProjectId,
      scale,
      towerElevation,
      phases,
      connections,
      hiddenTowerIds,
      individualAltitudes,
      showToast,
    ]
  )

  const handleClearTowers = async () => {
    if (!selectedProjectId) return
    setIsClearing(true)
    try {
      await orionApi
        .from('tower_technical_data')
        .delete()
        .eq('project_id', selectedProjectId)
      setConnections([])
      setHiddenTowerIds(new Set())
      setIndividualAltitudes({})
      showToast({
        title: 'Torres Removidas',
        description: 'Todas as torres da obra foram removidas com sucesso.',
      })
      return true
    } catch (error) {
      showToast({
        title: 'Erro ao remover torres',
        description: 'Não foi possível remover as torres.',
        variant: 'destructive',
      })
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
    setIsLoading,
    isSaving,
    isClearing,
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
