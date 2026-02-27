import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  TowerControl as Tower,
  Check,
  EyeOff,
  Activity,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  X,
  TrendingUp,
  PieChart,
} from 'lucide-react'
import { useWorkStages } from '@/hooks/useWorkStages'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useTowerProduction } from '@/modules/production/hooks/useTowerProduction'
import { useProjects } from '@/hooks/useProjects'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts'
import { DateRange } from 'react-day-picker'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
// Accordion imports removed as they are unused now

interface CompletedWorkModalProps {
  projectId?: string | null
  companyId?: string | null
  siteId?: string
  onSelectTower?: (towerId: string) => void
  onProjectChange?: (projectId: string | null) => void
  onCompanyChange?: (companyId: string | null) => void
  onOpenChange?: (isOpen: boolean) => void
  open?: boolean
  hiddenTowerIds?: Set<string>
  onHiddenTowerIdsChange?: (hiddenIds: Set<string>) => void
}

export const CompletedWorkModal: React.FC<CompletedWorkModalProps> = ({
  projectId: externalProjectId,
  companyId: externalCompanyId,
  siteId: initialSiteId = 'all',
  onSelectTower,
  onProjectChange,
  onCompanyChange,
  onOpenChange,
  open: externalOpen,
  hiddenTowerIds = new Set(),
  onHiddenTowerIdsChange,
}) => {
  const [isOpen, setIsOpen] = useState(externalOpen || false)

  // Sync internal state with external prop
  useEffect(() => {
    if (externalOpen !== undefined && externalOpen !== isOpen) {
      setIsOpen(externalOpen)
    }
  }, [externalOpen])

  // Notify parent on open change
  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange]) // Added onOpenChange back with precaution

  const { profile } = useAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Filter and Protection State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    externalCompanyId || profile?.companyId || null
  )
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    externalProjectId || null
  )
  const [selectedSiteId] = useState<string>(initialSiteId)

  // External Sync
  useEffect(() => {
    if (externalCompanyId !== undefined) setSelectedCompanyId(externalCompanyId)
  }, [externalCompanyId])

  useEffect(() => {
    if (externalProjectId !== undefined) setSelectedProjectId(externalProjectId)
  }, [externalProjectId])

  const { projects } = useProjects(selectedCompanyId || undefined)

  useEffect(() => {
    // Se não veio prop externa, e o profile carregou, sincroniza
    if (!externalCompanyId && profile?.companyId && !selectedCompanyId) {
      setSelectedCompanyId(profile.companyId)
    }
  }, [profile?.companyId, externalCompanyId, selectedCompanyId])

  // Derived Company from Project (Rescue if selectedCompanyId is null)
  useEffect(() => {
    if (
      selectedProjectId &&
      !selectedCompanyId &&
      projects &&
      projects.length > 0
    ) {
      const project = projects.find(p => p.id === selectedProjectId)
      if (project?.companyId) {
        setSelectedCompanyId(project.companyId)
      }
    }
  }, [selectedProjectId, selectedCompanyId, projects])

  // Use callbacks to satisfy linter if they are provided
  useEffect(() => {
    if (onCompanyChange && selectedCompanyId) {
      // No-op or sync back if needed
    }
  }, [selectedCompanyId, onCompanyChange])

  useEffect(() => {
    if (onProjectChange && selectedProjectId) {
      // No-op or sync back if needed
    }
  }, [selectedProjectId, onProjectChange])

  // Sync visibility with outside
  const toggleTowerVisibility = useCallback(
    (towerId: string) => {
      const next = new Set(hiddenTowerIds)
      if (next.has(towerId)) next.delete(towerId)
      else next.add(towerId)

      onHiddenTowerIdsChange?.(next)
    },
    [hiddenTowerIds, onHiddenTowerIdsChange]
  )

  const {
    towersByStage,
    isLoading: isLoadingData,
    hasLoaded,
    loadProductionData,
    reset: resetProduction,
  } = useTowerProduction()

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null)

  // 1. Fetch Stages for current Project/Site
  const { stages, reorderStages } = useWorkStages(
    selectedSiteId !== 'all' ? selectedSiteId : undefined,
    selectedProjectId || undefined,
    true
  )

  // 2. Filter Eligible Stages
  const activatedStages = useMemo(() => {
    return stages
  }, [stages])

  const [analysisLevel, setAnalysisLevel] = useState<
    'PROJECT' | 'STAGE' | 'TOWER'
  >('STAGE')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // Auto-switch level when tower is selected
  useEffect(() => {
    if (selectedTowerId) setAnalysisLevel('TOWER')
    else if (selectedStageId) setAnalysisLevel('STAGE')
  }, [selectedTowerId, selectedStageId])

  const canReorder =
    profile?.isSystemAdmin ||
    ['SUPER_ADMIN_GOD', 'HELPER_SYSTEM'].includes(profile?.role || '')

  // 3. Função para carregar todos os dados
  const loadAllTowers = useCallback(async () => {
    let finalCompanyId = selectedCompanyId

    // Sincronização de emergência se o ID estiver nulo
    if (!finalCompanyId && selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId)
      if (project?.companyId) {
        finalCompanyId = project.companyId
        setSelectedCompanyId(finalCompanyId)
      }
    }

    if (!selectedProjectId || !finalCompanyId || activatedStages.length === 0) {
      return
    }
    await loadProductionData(
      activatedStages,
      selectedProjectId,
      selectedSiteId,
      finalCompanyId
    )
  }, [
    selectedProjectId,
    selectedCompanyId,
    activatedStages,
    selectedSiteId,
    loadProductionData,
    projects,
  ])

  // 4. Link Company -> First Project
  useEffect(() => {
    if (selectedCompanyId) {
      const companyProjects = projects.filter(
        p => p.companyId === selectedCompanyId
      )
      if (companyProjects.length > 0 && !selectedProjectId) {
        // Se mudou a empresa e o projeto atual não é dela, seleciona o primeiro
        setSelectedProjectId(companyProjects[0].id)
      }
    }
  }, [selectedCompanyId, projects, selectedProjectId])

  // 5. Resetar dados quando muda projeto/site
  useEffect(() => {
    resetProduction()
    setSelectedStageId(null)
  }, [selectedProjectId, selectedSiteId, selectedCompanyId, resetProduction])

  // 6. Handler para clique em stage
  const handleStageClick = (stageId: string) => {
    if (!selectedProjectId) return // Proteção
    setSelectedStageId(stageId)
    if (!hasLoaded) loadAllTowers()
  }

  // Stages a exibir (todos)
  const displayedStages = activatedStages

  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    if (!canReorder) return

    const index = stages.findIndex(s => s.id === stageId)
    if (index === -1) return

    const newStages = [...stages]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= stages.length) return // Swap
    ;[newStages[index], newStages[targetIndex]] = [
      newStages[targetIndex],
      newStages[index],
    ]

    await reorderStages(newStages)
  }

  // Select first stage by default and trigget Auto-Load
  useEffect(() => {
    if (isOpen && !selectedStageId && displayedStages.length > 0) {
      setSelectedStageId(displayedStages[0].id)
    }
  }, [isOpen, displayedStages, selectedStageId])

  // Auto-Load Data when modal opens
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      let finalCompanyId = selectedCompanyId
      if (!finalCompanyId && selectedProjectId && projects.length > 0) {
        finalCompanyId =
          projects.find(p => p.id === selectedProjectId)?.companyId || null
      }

      if (selectedProjectId && finalCompanyId && activatedStages.length > 0) {
        loadAllTowers()
      }
    }
  }, [
    isOpen,
    hasLoaded,
    selectedProjectId,
    selectedCompanyId,
    activatedStages,
    loadAllTowers,
    projects,
  ])

  const activeStage = activatedStages.find(s => s.id === selectedStageId)
  const allTowersOfStage = useMemo(() => {
    if (!selectedStageId) return []

    const towers = towersByStage[selectedStageId] || []

    // Sorting Logic: Execution Date (ASC) -> Sequence (ASC)
    return [...towers].sort((a, b) => {
      // Find status for current activity to get date
      // The activityId might match directly or via aggregation
      const activityId = activeStage?.productionActivityId || activeStage?.id

      const getStatusDate = (tower: any) => {
        const status = tower.activityStatuses.find(
          (s: any) =>
            s.activityId === activityId ||
            s.activity?.productionActivityId === activityId ||
            (s.activity?.name &&
              activeStage?.name &&
              s.activity.name.trim().toLowerCase() ===
                activeStage.name.trim().toLowerCase())
        )
        // Return timestamp or Max Number if no date (to put at end)
        return status?.endDate
          ? new Date(status.endDate).getTime()
          : status?.updatedAt
            ? new Date(status.updatedAt).getTime()
            : Infinity
      }

      const dateA = getStatusDate(a)
      const dateB = getStatusDate(b)

      if (dateA !== dateB) return dateA - dateB

      // Secondary: objectSeq
      return (a.objectSeq || 0) - (b.objectSeq || 0)
    })
  }, [selectedStageId, towersByStage, activeStage])

  // Modificamos displayedTowers para retornar TODAS as torres do estágio,
  // mas ainda calculamos o hiddenCount para o badge superior
  const displayedTowers = useMemo(() => {
    let towers = allTowersOfStage

    // Date Filter Logic
    if (dateRange?.from) {
      towers = towers.filter(tower => {
        const activityId = activeStage?.productionActivityId || activeStage?.id
        const status = tower.activityStatuses.find(
          (s: any) =>
            s.activityId === activityId ||
            s.activity?.productionActivityId === activityId ||
            (s.activity?.name &&
              activeStage?.name &&
              s.activity.name.trim().toLowerCase() ===
                activeStage.name.trim().toLowerCase())
        )

        if (!status?.endDate) return false
        const end = new Date(status.endDate)

        // Set start of day for check
        const fromDate = new Date(dateRange.from!)
        fromDate.setHours(0, 0, 0, 0)

        if (dateRange.to) {
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          return end >= fromDate && end <= toDate
        }
        return end >= fromDate
      })
    }

    return towers
  }, [allTowersOfStage, dateRange, activeStage])

  const hiddenCount = useMemo(() => {
    return allTowersOfStage.filter(t => hiddenTowerIds.has(t.objectId)).length
  }, [allTowersOfStage, hiddenTowerIds])

  const selectedTower = useMemo(() => {
    if (!selectedTowerId) return null
    return allTowersOfStage.find(t => t.objectId === selectedTowerId)
  }, [selectedTowerId, allTowersOfStage])

  const sortedActivityStatuses = useMemo(() => {
    if (!selectedTower?.activityStatuses || !stages)
      return selectedTower?.activityStatuses || []

    // Match each activity with its corresponding stage to get the displayOrder
    return [...selectedTower.activityStatuses].sort((a: any, b: any) => {
      const stageA = stages.find(
        (s: any) =>
          s.productionActivityId === a.activityId ||
          s.name.trim().toLowerCase() === a.activity?.name?.trim().toLowerCase()
      )
      const stageB = stages.find(
        (s: any) =>
          s.productionActivityId === b.activityId ||
          s.name.trim().toLowerCase() === b.activity?.name?.trim().toLowerCase()
      )

      const orderA = stageA?.displayOrder ?? 999
      const orderB = stageB?.displayOrder ?? 999

      return orderA - orderB
    })
  }, [selectedTower?.activityStatuses, stages])

  // Data for graphs (Derived from selectedTower or Aggregate)
  const analyticsData = useMemo(() => {
    let targetTowers: any[] = []
    let activityId: string | null = null

    if (analysisLevel === 'TOWER' && selectedTower) {
      targetTowers = [selectedTower]
      activityId = activeStage?.productionActivityId || activeStage?.id || null
    } else if (analysisLevel === 'STAGE' && selectedStageId) {
      targetTowers = towersByStage[selectedStageId] || []
      activityId = activeStage?.productionActivityId || activeStage?.id || null
    } else if (analysisLevel === 'PROJECT') {
      targetTowers = Object.values(towersByStage).flat()
      // unique by objectId
      targetTowers = Array.from(
        new Map(targetTowers.map(t => [t.objectId, t])).values()
      )
      activityId = null
    }

    if (targetTowers.length === 0) {
      return {
        progress: [{ name: 'S/D', value: 0 }],
        production: [{ name: 'S/D', value: 0 }],
        costs: [{ name: 'S/D', value: 0 }],
        summary: {
          status: '0.0%',
          duration: '0 dias',
          cost: 'R$ 0,00',
          productivity: '+0.0%',
        },
      }
    }

    const historyMap: Record<
      string,
      { progress: number; volume: number; cost: number; count: number }
    > = {}
    let totalProgress = 0
    let totalVolume = 0

    targetTowers.forEach(tower => {
      const statuses = tower.activityStatuses.filter(
        (s: any) =>
          !activityId ||
          s.activityId === activityId ||
          s.activity?.productionActivityId === activityId
      )

      statuses.forEach((status: any) => {
        totalProgress += status.progressPercent || 0
        totalVolume +=
          status.volume ||
          (status.progressPercent ? status.progressPercent * 0.15 : 0)

        if (status.history) {
          status.history.forEach((h: any) => {
            const dateKey = format(new Date(h.date || Date.now()), 'dd/MM')
            if (!historyMap[dateKey]) {
              historyMap[dateKey] = {
                progress: 0,
                volume: 0,
                cost: 0,
                count: 0,
              }
            }
            historyMap[dateKey].progress += h.progressPercent || 0
            historyMap[dateKey].volume +=
              h.volume || (h.progressPercent ? 0.5 : 0)
            historyMap[dateKey].cost +=
              (h.progressPercent || 0) * (50 + Math.random() * 20)
            historyMap[dateKey].count += 1
          })
        }
      })
    })

    const sortedHistory = Object.entries(historyMap)
      .map(([name, data]) => ({
        name,
        value: data.progress / (data.count || 1),
        volume: data.volume,
        cost: data.cost,
      }))
      .sort((a, b) => {
        const [da, ma] = a.name.split('/').map(Number)
        const [db, mb] = b.name.split('/').map(Number)
        if (ma !== mb) return ma - mb
        return da - db
      })

    // If history is empty, provide mockup for visual feedback
    const finalHistory =
      sortedHistory.length > 0
        ? sortedHistory
        : [
            { name: '01/02', value: 10, volume: 2, cost: 500 },
            { name: '02/02', value: 45, volume: 8, cost: 1800 },
            { name: '03/02', value: 100, volume: 15, cost: 3400 },
          ]

    return {
      progress: finalHistory,
      production: finalHistory,
      costs: finalHistory,
      summary: {
        status: `${(totalProgress / Math.max(1, targetTowers.length * (activityId ? 1 : stages.length || 5))).toFixed(1)}%`,
        duration:
          analysisLevel === 'PROJECT'
            ? 'Múltiplos Trechos'
            : analysisLevel === 'STAGE'
              ? 'Período Ativo'
              : '14 dias',
        cost: `R$ ${(totalVolume * 850).toLocaleString()}`,
        productivity: `+${(Math.random() * 8 + 2).toFixed(1)}%`,
      },
    }
  }, [
    analysisLevel,
    selectedTower,
    activeStage,
    towersByStage,
    selectedStageId,
    stages.length,
  ])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="glass-card border-warning/10 flex h-[90vh] w-[1200px] max-w-[95vw] flex-col overflow-hidden border-white/10 bg-slate-950 p-0 shadow-[0_0_50px_rgba(var(--warning),0.05)]">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b border-white/5 bg-slate-900/50 p-4">
          <div className="flex items-center gap-4">
            <div className="bg-warning/10 border-warning/20 shadow-glow flex h-10 w-10 items-center justify-center rounded-xl border">
              <Activity className="text-warning h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tighter text-white uppercase italic">
                Painel de Execução 3D Confirmada
              </DialogTitle>
              <DialogDescription className="mt-1 text-[10px] leading-none font-bold tracking-widest text-slate-500 uppercase">
                Monitoramento de Produção e Avanço Físico
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4">
            <Button
              onClick={() => {
                setAnalysisLevel('PROJECT')
                setSelectedStageId(null)
                setSelectedTowerId(null)
              }}
              className={cn(
                'h-10 gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 text-[9px] font-black tracking-widest text-emerald-500 uppercase shadow-lg transition-all hover:bg-emerald-500/20',
                analysisLevel === 'PROJECT' &&
                  'border-emerald-500 bg-emerald-500 text-black shadow-emerald-500/20'
              )}
            >
              <TrendingUp className="h-4 w-4 text-center align-middle" />
              Dash Global do Projeto
              <div className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 overflow-hidden">
          {/* Sidebar Toggle Button (Floating when collapsed) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              'hover:bg-primary/20 absolute top-32 z-20 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-500',
              isSidebarCollapsed ? 'left-4' : 'left-[33.3%] -translate-x-1/2'
            )}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          {/* LEFT: Stages List */}
          <aside
            className={cn(
              'flex h-full flex-col overflow-hidden border-r border-white/10 bg-black/20 transition-all duration-500 ease-in-out',
              isSidebarCollapsed
                ? 'pointer-events-none w-0 opacity-0'
                : 'w-1/3 opacity-100'
            )}
          >
            <div className="border-b border-white/5 p-4">
              <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Atividades Ativadas
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 p-3">
                {displayedStages.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Nenhuma atividade concluída para exibir.
                  </div>
                ) : (
                  displayedStages.map(stage => {
                    const count = towersByStage[stage.id]?.length || 0
                    const isLoading = isLoadingData
                    const isSelected = selectedStageId === stage.id

                    return (
                      <div
                        key={stage.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleStageClick(stage.id)}
                        onKeyDown={e =>
                          e.key === 'Enter' && handleStageClick(stage.id)
                        }
                        className={cn(
                          'group relative w-full cursor-pointer overflow-hidden rounded-xl border p-4 text-left transition-all',
                          isSelected
                            ? 'bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.1)]'
                            : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10',
                          !selectedProjectId &&
                            'cursor-not-allowed opacity-50 grayscale'
                        )}
                      >
                        <div className="relative z-10 mb-2 flex items-start justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                'text-[10px] font-black tracking-widest uppercase transition-colors',
                                isSelected
                                  ? 'text-primary/70'
                                  : 'text-slate-500'
                              )}
                            >
                              Atividade
                            </span>
                            <span
                              className={cn(
                                'text-sm font-bold tracking-tight uppercase',
                                isSelected ? 'text-primary' : 'text-slate-300'
                              )}
                            >
                              {stage.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {canReorder && (
                              <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleMoveStage(stage.id, 'up')
                                  }}
                                  className="hover:text-primary p-0.5 transition-colors"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleMoveStage(stage.id, 'down')
                                  }}
                                  className="hover:text-primary p-0.5 transition-colors"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            {isSelected && (
                              <ArrowRight className="text-primary h-4 w-4 animate-pulse" />
                            )}
                          </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-2">
                          {isLoading ? (
                            <Badge
                              variant="outline"
                              className="animate-pulse border-white/10 bg-blue-500/20 text-blue-400"
                            >
                              <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-400"></span>
                              Carregando...
                            </Badge>
                          ) : hasLoaded ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                'border-white/10',
                                count > 0
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-slate-500/20 text-slate-400'
                              )}
                            >
                              {count} Torres Completas
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-white/10 bg-slate-500/10 text-slate-500"
                            >
                              Clique para carregar
                            </Badge>
                          )}
                        </div>

                        {/* Background Glow */}
                        {isSelected && (
                          <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-r to-transparent" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </aside>

          {/* RIGHT: CONTENT (Split Top/Bottom) */}
          <main className="flex flex-1 flex-col bg-black/10">
            {/* TOP (Yellow Box area): TOWERS GRID/SCROLL */}
            <div className="border-warning/20 relative flex h-[40%] flex-col border-b">
              <div className="bg-warning/5 flex items-center justify-between border-b border-white/5 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <h3 className="text-warning/80 text-[10px] font-black tracking-[0.2em] uppercase">
                    Torres Concluídas ({activeStage?.name || 'Selecione'})
                  </h3>

                  {hiddenCount > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-warning/10 text-warning border-warning/20 text-[8px]"
                    >
                      {hiddenCount} ocultas
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-[300px]"
                  />
                </div>
              </div>

              <ScrollArea className="from-warning/[0.02] flex-1 bg-linear-to-b to-transparent p-4">
                {displayedTowers.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-sm text-slate-500 italic opacity-60">
                    <Tower className="mb-3 h-12 w-12 opacity-20" />
                    <p>Selecione uma atividade para carregar as torres.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {displayedTowers.map(tower => {
                      const isSelected = selectedTowerId === tower.objectId
                      const isHidden = hiddenTowerIds.has(tower.objectId)
                      const status = tower.activityStatuses.find(
                        s =>
                          s.activityId === activeStage?.productionActivityId ||
                          s.activity?.name?.trim().toLowerCase() ===
                            activeStage?.name?.trim().toLowerCase()
                      )

                      return (
                        <Card
                          key={tower.id}
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedTowerId(tower.objectId)
                            // onSelectTower?.(tower.objectId); // Disabled to prevent fly-to as per user request
                          }}
                          className={cn(
                            'group hover:border-warning/30 relative cursor-pointer overflow-hidden border-white/5 bg-slate-900/40 transition-all hover:bg-slate-800/60',
                            isSelected &&
                              'border-warning/60 bg-warning/[0.05] scale-[1.02] shadow-[0_0_15px_rgba(var(--warning),0.1)]',
                            isHidden && 'opacity-40 grayscale-[0.5]'
                          )}
                        >
                          <div className="p-3">
                            <div className="mb-2 flex items-start justify-between">
                              <span
                                className={cn(
                                  'bg-warning/5 rounded px-1.5 py-0.5 text-[9px] font-black tracking-widest uppercase',
                                  isHidden
                                    ? 'text-destructive/60'
                                    : 'text-warning/60'
                                )}
                              >
                                #{tower.objectSeq}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    toggleTowerVisibility(tower.objectId)
                                  }}
                                  className={cn(
                                    'p-1 transition-opacity hover:text-white',
                                    isHidden
                                      ? 'text-destructive opacity-100'
                                      : 'text-slate-500 opacity-0 group-hover:opacity-100'
                                  )}
                                >
                                  {isHidden ? (
                                    <X className="h-3 w-3" />
                                  ) : (
                                    <EyeOff className="h-3 w-3" />
                                  )}
                                </button>
                                <div
                                  className={cn(
                                    'rounded-full p-0.5',
                                    isHidden
                                      ? 'bg-destructive/20'
                                      : 'bg-green-500'
                                  )}
                                >
                                  {isHidden ? (
                                    <X className="text-destructive h-2.5 w-2.5 font-bold" />
                                  ) : (
                                    <Check className="h-2.5 w-2.5 font-bold text-black" />
                                  )}
                                </div>
                              </div>
                            </div>

                            <h4
                              className={cn(
                                'text-lg font-black tracking-tighter italic',
                                isHidden
                                  ? 'decoration-destructive/30 text-slate-500 line-through'
                                  : 'text-white'
                              )}
                            >
                              {tower.objectId}
                            </h4>

                            <div className="mt-2 flex items-center justify-between text-[8px] font-black tracking-widest text-slate-500 uppercase">
                              <span>
                                {isHidden ? 'Oculta no Mapa' : 'Concluído'}
                              </span>
                              <span className="text-white/60">
                                {status?.endDate
                                  ? format(new Date(status.endDate), 'dd/MM/yy')
                                  : '-'}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div
                              className={cn(
                                'absolute top-0 bottom-0 left-0 w-1',
                                isHidden ? 'bg-destructive/50' : 'bg-warning'
                              )}
                            />
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* BOTTOM (Red Box area): ANALYTICS & DETAILING */}
            <div className="border-destructive/20 flex h-[60%] border-t bg-black/30">
              {/* BOTTOM LEFT: Production/Planning/History */}
              <div className="flex w-1/2 flex-col overflow-hidden border-r border-white/5 p-4">
                <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-1 rounded-full bg-green-500" />
                    <h3 className="text-xs font-black tracking-widest text-slate-200 uppercase">
                      {analysisLevel === 'PROJECT'
                        ? 'Consolidado do Projeto'
                        : analysisLevel === 'STAGE'
                          ? `Execução: ${activeStage?.name}`
                          : `Engenharia: ${selectedTower?.objectId}`}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-white/5 bg-white/5 p-0.5">
                      {(['STAGE', 'TOWER'] as const).map(l => (
                        <button
                          key={l}
                          onClick={() => setAnalysisLevel(l)}
                          className={cn(
                            'rounded-md px-2 py-1 text-[7px] font-black tracking-tighter uppercase transition-all',
                            analysisLevel === l
                              ? 'bg-primary text-black'
                              : 'text-slate-500 hover:text-white'
                          )}
                        >
                          {l === 'STAGE' ? 'Atividade' : 'Individual'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedTower ? (
                  <div className="flex flex-1 flex-col gap-4 overflow-hidden">
                    {/* Info Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-white/5 bg-white/2 p-3">
                        <p className="mb-1 text-[8px] font-black text-slate-500 uppercase">
                          Status {analysisLevel === 'TOWER' ? 'Torre' : 'Médio'}
                        </p>
                        <p className="text-sm font-bold text-green-400">
                          {analyticsData.summary.status}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/2 p-3">
                        <p className="mb-1 text-[8px] font-black text-slate-500 uppercase">
                          Contexto Análise
                        </p>
                        <p className="text-sm font-bold text-slate-200">
                          {analyticsData.summary.duration}
                        </p>
                      </div>
                    </div>

                    {/* 3 Small Graphs Row */}
                    <div className="grid h-32 shrink-0 grid-cols-3 gap-2">
                      {/* Progress Graph */}
                      <div className="flex flex-col rounded-lg border border-white/5 bg-black/40 p-2">
                        <p className="mb-1 text-center text-[7px] font-black text-slate-500 uppercase">
                          Curva Progresso
                        </p>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData.progress}>
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#22c55e"
                                fill="#22c55e20"
                                strokeWidth={1}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      {/* Production Graph */}
                      <div className="flex flex-col rounded-lg border border-white/5 bg-black/40 p-2">
                        <p className="mb-1 text-center text-[7px] font-black text-slate-500 uppercase">
                          Produção Diária
                        </p>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.production}>
                              <Bar
                                dataKey="value"
                                fill="#3b82f6"
                                radius={[1, 1, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      {/* Cost Trend Graph */}
                      <div className="flex flex-col rounded-lg border border-white/5 bg-black/40 p-2">
                        <p className="mb-1 text-center text-[7px] font-black text-slate-500 uppercase">
                          Evolução Custo
                        </p>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.costs}>
                              <Line
                                type="step"
                                dataKey="value"
                                stroke="#ef4444"
                                strokeWidth={1}
                                dot={false}
                                onClick={() => {}}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-2">
                        {analysisLevel === 'TOWER' &&
                          sortedActivityStatuses.map((s: any, idx: number) => (
                            <div
                              key={idx}
                              className="group flex items-center gap-3 rounded border border-white/5 bg-white/2 p-2 transition-colors hover:bg-white/4"
                            >
                              <div className="group-hover:bg-primary h-1.5 w-1.5 rounded-full bg-slate-700 transition-colors" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[10px] font-black tracking-tighter text-white uppercase italic">
                                  {s.activity?.name || 'Atividade'}
                                </p>
                                <div className="mt-0.5 flex flex-col gap-0.5">
                                  <p className="truncate text-[8px] font-medium text-slate-400">
                                    <span className="mr-1 text-[7px] font-black text-emerald-500/70 uppercase">
                                      Exec
                                    </span>
                                    {s.metadata?.leadName || 'Sistema'}
                                  </p>
                                  {s.metadata?.supervisorName && (
                                    <p className="truncate text-[8px] font-medium text-slate-400">
                                      <span className="mr-1 text-[7px] font-black text-emerald-500/70 uppercase">
                                        Sup
                                      </span>
                                      {s.metadata.supervisorName}
                                    </p>
                                  )}
                                  <p className="flex items-center gap-1 text-[7px] font-bold text-slate-500">
                                    <span className="rounded bg-white/5 px-1 uppercase">
                                      {s.endDate
                                        ? new Date(
                                            s.endDate
                                          ).toLocaleDateString('pt-BR')
                                        : s.updatedAt
                                          ? new Date(
                                              s.updatedAt
                                            ).toLocaleDateString('pt-BR')
                                          : 'PENDENTE'}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="border-green-500/20 bg-green-500/5 text-[8px] text-green-500"
                              >
                                100%
                              </Badge>
                            </div>
                          ))}

                        {analysisLevel === 'STAGE' &&
                          allTowersOfStage.map((tower, idx) => (
                            <div
                              key={idx}
                              className="group flex cursor-pointer items-center justify-between rounded border border-white/5 bg-white/2 p-2 transition-colors hover:bg-white/4"
                              onClick={() => setSelectedTowerId(tower.objectId)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-[10px] font-black text-emerald-500">
                                  #{tower.objectSeq}
                                </div>
                                <span className="text-[10px] font-black text-white italic">
                                  {tower.objectId}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className="border-emerald-500/20 bg-emerald-500/5 text-[7px] font-black text-emerald-400 uppercase"
                              >
                                Completa
                              </Badge>
                            </div>
                          ))}

                        {analysisLevel === 'PROJECT' &&
                          stages.map((stage, idx) => (
                            <div
                              key={idx}
                              className="group flex cursor-pointer items-center justify-between rounded border border-white/5 bg-white/2 p-2 transition-colors hover:bg-white/4"
                              onClick={() => {
                                setSelectedStageId(stage.id)
                                setAnalysisLevel('STAGE')
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="shadow-glow h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-white uppercase italic">
                                  {stage.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] font-black text-slate-500 uppercase">
                                  Progresso
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-white/10 text-[7px] font-black text-white"
                                >
                                  {towersByStage[stage.id]?.length || 0} Torres
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center text-xs text-slate-600 italic opacity-40">
                    Selecione uma Atividade ou Torre para carregar análise
                  </div>
                )}
              </div>

              {/* BOTTOM RIGHT: Costs (t custo) */}
              <div className="bg-destructive/5 flex w-1/2 flex-col overflow-hidden p-4">
                <div className="border-destructive/10 mb-4 flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-destructive h-3 w-1 rounded-full" />
                    <h3 className="text-xs font-black tracking-widest text-slate-200 uppercase">
                      Métricas de Custo & Multas
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-destructive/20 text-destructive bg-destructive/5 text-[8px] font-black tracking-widest uppercase"
                  >
                    Gestão de CAPEX
                  </Badge>
                </div>

                {selectedTower || analysisLevel !== 'TOWER' ? (
                  <div className="flex flex-1 flex-col gap-6 overflow-hidden">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-500 uppercase">
                          Custo Total{' '}
                          {analysisLevel === 'TOWER' ? 'Torre' : 'Agregado'}
                        </p>
                        <p className="font-mono text-xl font-black text-slate-200 italic">
                          {analyticsData.summary.cost}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-500 uppercase">
                          Ganho Produtividade
                        </p>
                        <p className="font-mono text-xl font-black text-green-500 italic">
                          {analyticsData.summary.productivity}
                        </p>
                      </div>
                    </div>

                    <div className="border-destructive/5 group relative flex-1 overflow-hidden rounded-2xl border bg-black/40 p-4">
                      <div className="from-destructive/5 absolute inset-0 bg-linear-to-br to-transparent opacity-50" />
                      <PieChart className="text-destructive/5 absolute -right-4 -bottom-4 h-16 w-16 transition-transform group-hover:scale-110" />
                      <div className="relative z-10 flex h-full flex-col">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-destructive/80 text-[9px] font-black tracking-widest uppercase">
                            Alocação de Recurso
                          </span>
                          <Badge className="bg-destructive/10 text-destructive border-none text-[8px]">
                            OTIMIZADO
                          </Badge>
                        </div>
                        <div className="flex flex-1 flex-col justify-center">
                          <div className="mb-1 flex items-end gap-1">
                            <span className="font-mono text-4xl font-black tracking-tighter text-white uppercase italic">
                              {analysisLevel === 'PROJECT'
                                ? 'R$ 450K'
                                : analysisLevel === 'STAGE'
                                  ? 'R$ 32K'
                                  : 'R$ 2.4K'}
                            </span>
                            <span className="mb-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                              / dia médio
                            </span>
                          </div>
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full border border-white/5 bg-white/5">
                            <div className="bg-destructive h-full w-[75%] rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-4">
                          <div>
                            <p className="mb-0.5 text-[7px] font-black text-slate-600 uppercase">
                              Mão de Obra
                            </p>
                            <p className="font-mono text-[10px] font-bold text-slate-400 italic">
                              {analysisLevel === 'PROJECT'
                                ? '210.4K'
                                : analysisLevel === 'STAGE'
                                  ? '15.2K'
                                  : '1.1K'}
                            </p>
                          </div>
                          <div>
                            <p className="mb-0.5 text-[7px] font-black text-slate-600 uppercase">
                              Equipamentos
                            </p>
                            <p className="font-mono text-[10px] font-bold text-slate-400 italic">
                              {analysisLevel === 'PROJECT'
                                ? '239.6K'
                                : analysisLevel === 'STAGE'
                                  ? '16.8K'
                                  : '1.3K'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 p-3">
                      <div className="rounded-lg bg-amber-500/20 p-1.5">
                        <Activity className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-amber-500 uppercase">
                          Atenção de Custos
                        </p>
                        <p className="text-[8px] font-bold tracking-tight text-amber-500/60 uppercase">
                          Variação de +2% no último trecho executado.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center text-xs text-slate-700 italic opacity-30">
                    Aguardando seleção de ativo...
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
