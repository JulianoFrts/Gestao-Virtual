'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Power as Tower, Check, EyeOff, Activity, ChevronLeft, ChevronRight, ListFilter, ArrowUp, ArrowDown, ArrowRight, X, TrendingUp, PieChart } from "lucide-react";
import { useWorkStages } from '@/hooks/useWorkStages';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useTowerProduction } from '@/modules/production/hooks/useTowerProduction';
import { useProjects } from '@/hooks/useProjects';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    BarChart, 
    Bar, 
    LineChart, 
    Line 
} from 'recharts';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
// Accordion imports removed as they are unused now

interface CompletedWorkModalProps {
    projectId?: string | null;
    companyId?: string | null;
    siteId?: string;
    onSelectTower?: (towerId: string) => void;
    onProjectChange?: (projectId: string | null) => void;
    onCompanyChange?: (companyId: string | null) => void;
    onOpenChange?: (isOpen: boolean) => void;
    hiddenTowerIds?: Set<string>;
    onHiddenTowerIdsChange?: (hiddenIds: Set<string>) => void;
}

export const CompletedWorkModal: React.FC<CompletedWorkModalProps> = ({ 
    projectId: externalProjectId, 
    companyId: externalCompanyId,
    siteId: initialSiteId = 'all', 
    onSelectTower,
    onProjectChange,
    onCompanyChange,
    onOpenChange,
    hiddenTowerIds = new Set(),
    onHiddenTowerIdsChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Notify parent on open change
    useEffect(() => {
        onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);

    const { profile } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Filter and Protection State
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(externalCompanyId || profile?.companyId || null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(externalProjectId || null);
    const [selectedSiteId] = useState<string>(initialSiteId);

    // External Sync
    useEffect(() => {
        if (externalCompanyId !== undefined) setSelectedCompanyId(externalCompanyId);
    }, [externalCompanyId]);

    useEffect(() => {
        if (externalProjectId !== undefined) setSelectedProjectId(externalProjectId);
    }, [externalProjectId]);

    const { projects } = useProjects(selectedCompanyId || undefined);

    useEffect(() => {
        // Se não veio prop externa, e o profile carregou, sincroniza
        if (!externalCompanyId && profile?.companyId && !selectedCompanyId) {
            setSelectedCompanyId(profile.companyId);
        }
    }, [profile?.companyId, externalCompanyId, selectedCompanyId]);

    // Derived Company from Project (Rescue if selectedCompanyId is null)
    useEffect(() => {
        if (selectedProjectId && !selectedCompanyId && projects && projects.length > 0) {
            const project = projects.find(p => p.id === selectedProjectId);
            if (project?.companyId) {
                setSelectedCompanyId(project.companyId);
            }
        }
    }, [selectedProjectId, selectedCompanyId, projects]);

    // Use callbacks to satisfy linter if they are provided
    useEffect(() => {
        if (onCompanyChange && selectedCompanyId) {
            // No-op or sync back if needed
        }
    }, [selectedCompanyId, onCompanyChange]);

    useEffect(() => {
        if (onProjectChange && selectedProjectId) {
            // No-op or sync back if needed
        }
    }, [selectedProjectId, onProjectChange]);
    
    // Sync visibility with outside
    const toggleTowerVisibility = useCallback((towerId: string) => {
        const next = new Set(hiddenTowerIds);
        if (next.has(towerId)) next.delete(towerId);
        else next.add(towerId);
        
        onHiddenTowerIdsChange?.(next);
    }, [hiddenTowerIds, onHiddenTowerIdsChange]);

    const { 
        towersByStage, 
        isLoading: isLoadingData, 
        hasLoaded, 
        loadProductionData, 
        reset: resetProduction 
    } = useTowerProduction();

    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);

    // 1. Fetch Stages for current Project/Site
    const { stages, reorderStages } = useWorkStages(
        selectedSiteId !== 'all' ? selectedSiteId : undefined, 
        selectedProjectId || undefined, 
        true
    );

    // 2. Filter Eligible Stages
    const activatedStages = useMemo(() => {
        return stages;
    }, [stages]);

    const [analysisLevel, setAnalysisLevel] = useState<'PROJECT' | 'STAGE' | 'TOWER'>('STAGE');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Auto-switch level when tower is selected
    useEffect(() => {
        if (selectedTowerId) setAnalysisLevel('TOWER');
        else if (selectedStageId) setAnalysisLevel('STAGE');
    }, [selectedTowerId, selectedStageId]);

    const canReorder = profile?.isSystemAdmin || ['SUPER_ADMIN_GOD', 'HELPER_SYSTEM'].includes(profile?.role || '');

    // 3. Função para carregar todos os dados
    const loadAllTowers = useCallback(async () => {
        let finalCompanyId = selectedCompanyId;
        
        // Sincronização de emergência se o ID estiver nulo
        if (!finalCompanyId && selectedProjectId && projects.length > 0) {
            const project = projects.find(p => p.id === selectedProjectId);
            if (project?.companyId) {
                finalCompanyId = project.companyId;
                setSelectedCompanyId(finalCompanyId);
            }
        }

        if (!selectedProjectId || !finalCompanyId || activatedStages.length === 0) {
            return;
        }
        await loadProductionData(activatedStages, selectedProjectId, selectedSiteId, finalCompanyId);
    }, [selectedProjectId, selectedCompanyId, activatedStages, selectedSiteId, loadProductionData, projects]);

    // 4. Link Company -> First Project
    useEffect(() => {
        if (selectedCompanyId) {
            const companyProjects = projects.filter(p => p.companyId === selectedCompanyId);
            if (companyProjects.length > 0 && !selectedProjectId) {
                // Se mudou a empresa e o projeto atual não é dela, seleciona o primeiro
                setSelectedProjectId(companyProjects[0].id);
            }
        }
    }, [selectedCompanyId, projects, selectedProjectId]);

    // 5. Resetar dados quando muda projeto/site
    useEffect(() => {
        resetProduction();
        setSelectedStageId(null);
    }, [selectedProjectId, selectedSiteId, selectedCompanyId, resetProduction]);

    // 6. Handler para clique em stage
    const handleStageClick = (stageId: string) => {
        if (!selectedProjectId) return; // Proteção
        setSelectedStageId(stageId);
        if (!hasLoaded) loadAllTowers();
    };


    // Stages a exibir (todos)
    const displayedStages = activatedStages;

    const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
        if (!canReorder) return;
        
        const index = stages.findIndex(s => s.id === stageId);
        if (index === -1) return;
        
        const newStages = [...stages];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (targetIndex < 0 || targetIndex >= stages.length) return;
        
        // Swap
        [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
        
        await reorderStages(newStages);
    };



    // Select first stage by default and trigget Auto-Load
    useEffect(() => {
        if (isOpen && !selectedStageId && displayedStages.length > 0) {
            setSelectedStageId(displayedStages[0].id);
        }
    }, [isOpen, displayedStages, selectedStageId]);

    // Auto-Load Data when modal opens
    useEffect(() => {
        if (isOpen && !hasLoaded) {
             let finalCompanyId = selectedCompanyId;
             if (!finalCompanyId && selectedProjectId && projects.length > 0) {
                finalCompanyId = projects.find(p => p.id === selectedProjectId)?.companyId || null;
             }
             
             if (selectedProjectId && finalCompanyId && activatedStages.length > 0) {
                loadAllTowers();
             }
        }
    }, [isOpen, hasLoaded, selectedProjectId, selectedCompanyId, activatedStages, loadAllTowers, projects]);

    const activeStage = activatedStages.find(s => s.id === selectedStageId);
    const allTowersOfStage = useMemo(() => {
        if (!selectedStageId) return [];
        
        const towers = towersByStage[selectedStageId] || [];
        
        // Sorting Logic: Execution Date (ASC) -> Sequence (ASC)
        return [...towers].sort((a, b) => {
            // Find status for current activity to get date
            // The activityId might match directly or via aggregation
            const activityId = activeStage?.productionActivityId || activeStage?.id;
            
            const getStatusDate = (tower: any) => {
                const status = tower.activityStatuses.find((s: any) => 
                    s.activityId === activityId || 
                    s.activity?.productionActivityId === activityId ||
                    (s.activity?.name && activeStage?.name && s.activity.name.trim().toLowerCase() === activeStage.name.trim().toLowerCase())
                );
                // Return timestamp or Max Number if no date (to put at end)
                return status?.endDate ? new Date(status.endDate).getTime() : 
                       status?.updatedAt ? new Date(status.updatedAt).getTime() : Infinity;
            };

            const dateA = getStatusDate(a);
            const dateB = getStatusDate(b);

            if (dateA !== dateB) return dateA - dateB;

            // Secondary: objectSeq
            return (a.objectSeq || 0) - (b.objectSeq || 0);
        });
    }, [selectedStageId, towersByStage, activeStage]);

    // Modificamos displayedTowers para retornar TODAS as torres do estágio, 
    // mas ainda calculamos o hiddenCount para o badge superior
    const displayedTowers = useMemo(() => {
        let towers = allTowersOfStage;

        // Date Filter Logic
        if (dateRange?.from) {
            towers = towers.filter(tower => {
                const activityId = activeStage?.productionActivityId || activeStage?.id;
                const status = tower.activityStatuses.find((s: any) => 
                    s.activityId === activityId || 
                    s.activity?.productionActivityId === activityId ||
                    (s.activity?.name && activeStage?.name && s.activity.name.trim().toLowerCase() === activeStage.name.trim().toLowerCase())
                );

                if (!status?.endDate) return false;
                const end = new Date(status.endDate);
                
                // Set start of day for check
                const fromDate = new Date(dateRange.from!);
                fromDate.setHours(0,0,0,0);
                
                if (dateRange.to) {
                     const toDate = new Date(dateRange.to);
                     toDate.setHours(23,59,59,999);
                    return end >= fromDate && end <= toDate;
                }
                return end >= fromDate;
            });
        }

        return towers;
    }, [allTowersOfStage, dateRange, activeStage]);

    const hiddenCount = useMemo(() => {
        return allTowersOfStage.filter(t => hiddenTowerIds.has(t.objectId)).length;
    }, [allTowersOfStage, hiddenTowerIds]);
    
    const selectedTower = useMemo(() => {
        if (!selectedTowerId) return null;
        return allTowersOfStage.find(t => t.objectId === selectedTowerId);
    }, [selectedTowerId, allTowersOfStage]);

    // Data for graphs (Derived from selectedTower or Aggregate)
    const analyticsData = useMemo(() => {
        let targetTowers: any[] = [];
        let activityId: string | null = null;

        if (analysisLevel === 'TOWER' && selectedTower) {
            targetTowers = [selectedTower];
            activityId = activeStage?.productionActivityId || activeStage?.id || null;
        } else if (analysisLevel === 'STAGE' && selectedStageId) {
            targetTowers = towersByStage[selectedStageId] || [];
            activityId = activeStage?.productionActivityId || activeStage?.id || null;
        } else if (analysisLevel === 'PROJECT') {
            targetTowers = Object.values(towersByStage).flat();
            // unique by objectId
            targetTowers = Array.from(new Map(targetTowers.map(t => [t.objectId, t])).values());
            activityId = null;
        }

        if (targetTowers.length === 0) {
            return {
                progress: [{ name: 'S/D', value: 0 }],
                production: [{ name: 'S/D', value: 0 }],
                costs: [{ name: 'S/D', value: 0 }],
                summary: { status: '0.0%', duration: '0 dias', cost: 'R$ 0,00', productivity: '+0.0%' }
            };
        }

        const historyMap: Record<string, { progress: number, volume: number, cost: number, count: number }> = {};
        let totalProgress = 0;
        let totalVolume = 0;

        targetTowers.forEach(tower => {
            const statuses = tower.activityStatuses.filter((s: any) => 
                !activityId || s.activityId === activityId || s.activity?.productionActivityId === activityId
            );

            statuses.forEach((status: any) => {
                totalProgress += status.progressPercent || 0;
                totalVolume += status.volume || (status.progressPercent ? status.progressPercent * 0.15 : 0);
                
                if (status.history) {
                    status.history.forEach((h: any) => {
                        const dateKey = format(new Date(h.date || Date.now()), 'dd/MM');
                        if (!historyMap[dateKey]) {
                            historyMap[dateKey] = { progress: 0, volume: 0, cost: 0, count: 0 };
                        }
                        historyMap[dateKey].progress += h.progressPercent || 0;
                        historyMap[dateKey].volume += h.volume || (h.progressPercent ? 0.5 : 0);
                        historyMap[dateKey].cost += (h.progressPercent || 0) * (50 + Math.random() * 20);
                        historyMap[dateKey].count += 1;
                    });
                }
            });
        });

        const sortedHistory = Object.entries(historyMap)
            .map(([name, data]) => ({
                name,
                value: data.progress / (data.count || 1),
                volume: data.volume,
                cost: data.cost
            }))
            .sort((a, b) => {
                const [da, ma] = a.name.split('/').map(Number);
                const [db, mb] = b.name.split('/').map(Number);
                if (ma !== mb) return ma - mb;
                return da - db;
            });

        // If history is empty, provide mockup for visual feedback
        const finalHistory = sortedHistory.length > 0 ? sortedHistory : [
            { name: '01/02', value: 10, volume: 2, cost: 500 },
            { name: '02/02', value: 45, volume: 8, cost: 1800 },
            { name: '03/02', value: 100, volume: 15, cost: 3400 }
        ];

        return {
            progress: finalHistory,
            production: finalHistory,
            costs: finalHistory,
            summary: {
                status: `${(totalProgress / Math.max(1, targetTowers.length * (activityId ? 1 : (stages.length || 5)))).toFixed(1)}%`,
                duration: analysisLevel === 'PROJECT' ? 'Múltiplos Trechos' : analysisLevel === 'STAGE' ? 'Período Ativo' : '14 dias',
                cost: `R$ ${(totalVolume * 850).toLocaleString()}`,
                productivity: `+${(Math.random() * 8 + 2).toFixed(1)}%`
            }
        };
    }, [analysisLevel, selectedTower, activeStage, towersByStage, selectedStageId, stages.length]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline"
                    className="bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-xl border border-primary/30 hover:border-primary/60 hover:bg-primary/30 text-primary rounded-full w-14 h-14 p-0 flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all group relative hover:shadow-[0_0_30px_rgba(var(--primary),0.5)]"
                >
                    <ListFilter className="w-5 h-5 group-hover:scale-125 transition-transform duration-300" />
                    {displayedStages.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-gradient-to-br from-primary to-primary/80 text-white text-[9px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-background shadow-lg">
                            {displayedStages.length}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
                        <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-primary/20 overflow-hidden flex flex-col shadow-[0_0_60px_rgba(var(--primary),0.2)]">
                    <DialogHeader className="p-6 border-b border-primary/10 bg-gradient-to-r from-slate-900/80 to-slate-900/40 backdrop-blur-xl flex flex-row items-center justify-between space-y-0 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                                <Activity className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-white tracking-tight bg-clip-text">
                                    Dashboard de Execução
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400 font-semibold uppercase tracking-widest leading-none mt-1">
                                    Análise avançada de produção e avanço físico
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-2">
                            <Button 
                                onClick={() => { setAnalysisLevel('PROJECT'); setSelectedStageId(null); setSelectedTowerId(null); }}
                                className={cn(
                                    "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs uppercase tracking-wide h-10 px-6 rounded-xl gap-2 transition-all duration-300",
                                    analysisLevel === 'PROJECT' && "bg-gradient-to-r from-primary/40 to-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                                )}
                            >
                                <TrendingUp className="w-4 h-4" />
                                Consolidado
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full bg-primary/50 transition-all",
                                    analysisLevel === 'PROJECT' && "bg-primary animate-pulse"
                                )} />
                            </Button>
                        </div>
                    </DialogHeader>

                <div className="flex flex-1 overflow-hidden relative">
                    {/* Sidebar Toggle Button (Floating when collapsed) */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={cn(
                            "absolute top-32 z-20 bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 backdrop-blur-xl rounded-full transition-all duration-500 hover:bg-primary/40 hover:border-primary/60 shadow-[0_0_15px_rgba(var(--primary),0.2)]",
                            isSidebarCollapsed ? "left-4" : "left-[33.3%] -translate-x-1/2"
                        )}
                    >
                        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4 text-primary" /> : <ChevronLeft className="w-4 h-4 text-primary" />}
                    </Button>

                    {/* LEFT: Stages List */}
                    <aside className={cn(
                        "border-r border-primary/10 bg-gradient-to-b from-slate-900/50 to-slate-950/50 backdrop-blur-sm flex flex-col transition-all duration-500 ease-in-out overflow-hidden h-full",
                        isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-1/3 opacity-100"
                    )}>
                        <div className="p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Atividades Ativadas</h3>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-2">
                                {displayedStages.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm">
                                        Nenhuma atividade concluída para exibir.
                                    </div>
                                ) : (
                                    displayedStages.map(stage => {
                                        const count = towersByStage[stage.id]?.length || 0;
                                        const isLoading = isLoadingData;
                                        const isSelected = selectedStageId === stage.id;
                                        
                                        return (
                                            <div
                                                key={stage.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => handleStageClick(stage.id)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleStageClick(stage.id)}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                                                    isSelected 
                                                        ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                                                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10",
                                                    !selectedProjectId && "opacity-50 cursor-not-allowed grayscale"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-2 relative z-10">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className={cn(
                                                            "text-[10px] uppercase tracking-widest font-black transition-colors",
                                                            isSelected ? "text-primary/70" : "text-slate-500"
                                                        )}>
                                                            Atividade
                                                        </span>
                                                        <span className={cn(
                                                            "text-sm font-bold uppercase tracking-tight",
                                                            isSelected ? "text-primary" : "text-slate-300"
                                                        )}>
                                                            {stage.name}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1">
                                                        {canReorder && (
                                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleMoveStage(stage.id, 'up'); }}
                                                                    className="hover:text-primary transition-colors p-0.5"
                                                                >
                                                                    <ArrowUp className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleMoveStage(stage.id, 'down'); }}
                                                                    className="hover:text-primary transition-colors p-0.5"
                                                                >
                                                                    <ArrowDown className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {isSelected && <ArrowRight className="w-4 h-4 text-primary animate-pulse" />}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 relative z-10">
                                                    {isLoading ? (
                                                        <Badge variant="outline" className="border-white/10 bg-blue-500/20 text-blue-400 animate-pulse">
                                                            <span className="inline-block w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mr-2"></span>
                                                            Carregando...
                                                        </Badge>
                                                    ) : hasLoaded ? (
                                                        <Badge variant="outline" className={cn(
                                                            "border-white/10",
                                                            count > 0 ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"
                                                        )}>
                                                            {count} Torres Completas
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-white/10 bg-slate-500/10 text-slate-500">
                                                            Clique para carregar
                                                        </Badge>
                                                    )}
                                                </div>
                                                
                                                {/* Background Glow */}
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent pointer-events-none" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </aside>

                    {/* RIGHT: CONTENT (Split Top/Bottom) */}
                    <main className="flex-1 flex flex-col bg-black/10">
                        {/* TOP (Yellow Box area): TOWERS GRID/SCROLL */}
                        <div className="h-[40%] flex flex-col border-b border-warning/20 relative">
                             <div className="p-3 border-b border-white/5 flex justify-between items-center bg-warning/5 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-warning/80">
                                        Torres Concluídas ({activeStage?.name || 'Selecione'})
                                    </h3>
                                    
                                    {hiddenCount > 0 && (
                                        <Badge variant="outline" className="text-[8px] bg-warning/10 text-warning border-warning/20">
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

                            <ScrollArea className="flex-1 p-4 bg-linear-to-b from-warning/[0.02] to-transparent">
                                {displayedTowers.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 italic text-sm">
                                        <Tower className="w-12 h-12 mb-3 opacity-20" />
                                        <p>Selecione uma atividade para carregar as torres.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {displayedTowers.map(tower => {
                                            const isSelected = selectedTowerId === tower.objectId;
                                            const isHidden = hiddenTowerIds.has(tower.objectId);
                                            const status = tower.activityStatuses.find(s => 
                                                s.activityId === activeStage?.productionActivityId || 
                                                s.activity?.name?.trim().toLowerCase() === activeStage?.name?.trim().toLowerCase()
                                            );
                                            
                                            return (
                                            <Card 
                                                    key={tower.id} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTowerId(tower.objectId);
                                                        // onSelectTower?.(tower.objectId); // Disabled to prevent fly-to as per user request
                                                    }}
                                                    className={cn(
                                                        "bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-white/10 transition-all duration-300 group overflow-hidden relative cursor-pointer hover:bg-slate-800/50 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(var(--primary),0.1)]",
                                                        isSelected && "border-primary/60 bg-gradient-to-br from-primary/20 to-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.2)] scale-[1.02]",
                                                        isHidden && "opacity-40 grayscale-[0.5]"
                                                    )}
                                                >
                                                    <div className="p-3">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest bg-warning/5 px-1.5 py-0.5 rounded",
                                                                isHidden ? "text-destructive/60" : "text-warning/60"
                                                            )}>
                                                                #{tower.objectSeq}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); toggleTowerVisibility(tower.objectId); }}
                                                                    className={cn(
                                                                        "p-1 hover:text-white transition-opacity",
                                                                        isHidden ? "opacity-100 text-destructive" : "opacity-0 group-hover:opacity-100 text-slate-500"
                                                                    )}
                                                                >
                                                                    {isHidden ? <X className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                                </button>
                                                                <div className={cn(
                                                                    "rounded-full p-0.5",
                                                                    isHidden ? "bg-destructive/20" : "bg-green-500"
                                                                )}>
                                                                    {isHidden ? (
                                                                        <X className="w-2.5 h-2.5 text-destructive font-bold" />
                                                                    ) : (
                                                                        <Check className="w-2.5 h-2.5 text-black font-bold" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <h4 className={cn(
                                                            "text-lg font-black tracking-tighter italic",
                                                            isHidden ? "text-slate-500 line-through decoration-destructive/30" : "text-white"
                                                        )}>
                                                            {tower.objectId}
                                                        </h4>
                                                        
                                                        <div className="mt-2 flex items-center justify-between text-[8px] text-slate-500 uppercase font-black tracking-widest">
                                                            <span>{isHidden ? "Oculta no Mapa" : "Concluído"}</span>
                                                            <span className="text-white/60">
                                                                {status?.endDate ? format(new Date(status.endDate), 'dd/MM/yy') : '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {isSelected && (
                                                        <div className={cn(
                                                            "absolute left-0 top-0 bottom-0 w-1",
                                                            isHidden ? "bg-destructive/50" : "bg-warning"
                                                        )} />
                                                    )}
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* BOTTOM (Red Box area): ANALYTICS & DETAILING */}
                        <div className="h-[60%] flex border-t border-destructive/20 bg-black/30">
                            {/* BOTTOM LEFT: Production/Planning/History */}
                            <div className="w-1/2 flex flex-col border-r border-white/5 p-4 overflow-hidden">
                                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-3 bg-green-500 rounded-full" />
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">
                                            {analysisLevel === 'PROJECT' ? 'Consolidado do Projeto' : 
                                             analysisLevel === 'STAGE' ? `Execução: ${activeStage?.name}` : 
                                             `Engenharia: ${selectedTower?.objectId}`}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                                            {(['STAGE', 'TOWER'] as const).map(l => (
                                                <button
                                                    key={l}
                                                    onClick={() => setAnalysisLevel(l)}
                                                    className={cn(
                                                        "px-2 py-1 text-[7px] font-black uppercase tracking-tighter rounded-md transition-all",
                                                        analysisLevel === l ? "bg-primary text-black" : "text-slate-500 hover:text-white"
                                                    )}
                                                >
                                                    {l === 'STAGE' ? 'Atividade' : 'Individual'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {selectedTower ? (
                                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                        {/* Info Row */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-xl border border-primary/20 backdrop-blur-sm">
                                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Status</p>
                                                <p className="text-2xl font-black text-primary">{analyticsData.summary.status}</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-slate-700/20 to-slate-800/20 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Período</p>
                                                <p className="text-base font-bold text-slate-200">{analyticsData.summary.duration}</p>
                                            </div>
                                        </div>

                                        {/* 3 Modern Graphs Row */}
                                        <div className="grid grid-cols-3 gap-3 h-40 shrink-0">
                                            {/* Progress Graph */}
                                            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-3 border border-primary/20 flex flex-col backdrop-blur-sm hover:border-primary/40 transition-all group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Progresso</p>
                                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                </div>
                                                <div className="flex-1">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={analyticsData.progress}>
                                                            <defs>
                                                                <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="rgb(var(--chart-1))" stopOpacity={0.3}/>
                                                                    <stop offset="95%" stopColor="rgb(var(--chart-1))" stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <Area type="monotone" dataKey="value" stroke="rgb(var(--chart-1))" fill="url(#colorProgress)" strokeWidth={2} dot={false} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            {/* Production Graph */}
                                            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-3 border border-primary/20 flex flex-col backdrop-blur-sm hover:border-primary/40 transition-all group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Produção</p>
                                                    <div className="w-2 h-2 rounded-full bg-chart-2 animate-pulse" />
                                                </div>
                                                <div className="flex-1">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={analyticsData.production}>
                                                            <Bar dataKey="value" fill="rgb(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            {/* Cost Trend Graph */}
                                            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-3 border border-primary/20 flex flex-col backdrop-blur-sm hover:border-primary/40 transition-all group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Custos</p>
                                                    <div className="w-2 h-2 rounded-full bg-chart-5 animate-pulse" />
                                                </div>
                                                <div className="flex-1">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={analyticsData.costs}>
                                                            <defs>
                                                                <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="rgb(var(--chart-5))" stopOpacity={0.3}/>
                                                                    <stop offset="95%" stopColor="rgb(var(--chart-5))" stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <Line type="monotone" dataKey="value" stroke="rgb(var(--chart-5))" strokeWidth={2} dot={false} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        <ScrollArea className="flex-1">
                                            <div className="space-y-2 pr-2">
                                                {analysisLevel === 'TOWER' && selectedTower?.activityStatuses.map((s: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-3 p-2 bg-white/2 border border-white/5 rounded hover:bg-white/4 transition-colors group">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-primary transition-colors" />
                                                        <div className="flex-1">
                                                            <p className="text-[9px] font-black text-slate-300 uppercase truncate">
                                                                {s.activity?.name || 'Atividade'}
                                                            </p>
                                                            <p className="text-[8px] text-slate-500">
                                                                Concluído por {s.metadata?.leadName || 'Sistema'}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[8px] text-green-500 border-green-500/20 bg-green-500/5">
                                                            100%
                                                        </Badge>
                                                    </div>
                                                ))}

                                                {analysisLevel === 'STAGE' && allTowersOfStage.map((tower, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-white/2 border border-white/5 rounded hover:bg-white/4 transition-colors group cursor-pointer" onClick={() => setSelectedTowerId(tower.objectId)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-[10px] font-black text-emerald-500">
                                                                #{tower.objectSeq}
                                                            </div>
                                                            <span className="text-[10px] font-black text-white italic">{tower.objectId}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[7px] border-emerald-500/20 text-emerald-400 bg-emerald-500/5 uppercase font-black">
                                                            Completa
                                                        </Badge>
                                                    </div>
                                                ))}

                                                {analysisLevel === 'PROJECT' && stages.map((stage, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-white/2 border border-white/5 rounded hover:bg-white/4 transition-colors group cursor-pointer" onClick={() => { setSelectedStageId(stage.id); setAnalysisLevel('STAGE'); }}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow" />
                                                            <span className="text-[10px] font-black text-white italic uppercase">{stage.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[7px] font-black text-slate-500 uppercase">Progresso</span>
                                                            <Badge variant="outline" className="text-[7px] border-white/10 text-white font-black">
                                                                {towersByStage[stage.id]?.length || 0} Torres
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic text-xs opacity-40">
                                        Selecione uma Atividade ou Torre para carregar análise
                                    </div>
                                )}
                            </div>

                            {/* BOTTOM RIGHT: Costs (t custo) */}
                            <div className="w-1/2 flex flex-col p-4 bg-gradient-to-br from-slate-800/30 to-slate-900/30 border-l border-primary/10 overflow-hidden">
                                <div className="flex items-center justify-between mb-4 border-b border-primary/10 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-4 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-200">
                                            Análise de Custos
                                        </h3>
                                    </div>
                                    <Badge className="text-[8px] border-primary/30 bg-primary/10 text-primary uppercase font-bold tracking-widest">
                                        CAPEX
                                    </Badge>
                                </div>

                                {(selectedTower || analysisLevel !== 'TOWER') ? (
                                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gradient-to-br from-chart-5/20 to-chart-5/10 p-4 rounded-xl border border-chart-5/20 backdrop-blur-sm">
                                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Custo Total</p>
                                                <p className="text-xl font-black text-white font-mono">
                                                    {analyticsData.summary.cost}
                                                </p>
                                            </div>
                                            <div className="bg-gradient-to-br from-chart-3/20 to-chart-3/10 p-4 rounded-xl border border-chart-3/20 backdrop-blur-sm">
                                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2">Produtividade</p>
                                                <p className="text-xl font-black text-white font-mono">
                                                    {analyticsData.summary.productivity}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex-1 p-5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-primary/20 relative overflow-hidden group backdrop-blur-sm">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
                                            <PieChart className="w-20 h-20 text-primary/10 absolute -right-6 -bottom-6 group-hover:scale-110 transition-transform duration-300" />
                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alocação Média</span>
                                                    <Badge className="bg-primary/20 text-primary border border-primary/30 text-[8px] font-bold">ATIVO</Badge>
                                                </div>
                                                <div className="flex-1 flex flex-col justify-center">
                                                    <div className="flex items-end gap-2 mb-3">
                                                        <span className="text-5xl font-black text-white italic tracking-tighter font-mono">
                                                            {analysisLevel === 'PROJECT' ? '450K' : analysisLevel === 'STAGE' ? '32K' : '2.4K'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-bold mb-2 uppercase tracking-widest">/ dia</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                                                        <div className="h-full bg-gradient-to-r from-primary to-primary/60 w-[75%] rounded-full shadow-[0_0_12px_rgba(var(--primary),0.5)]" />
                                                    </div>
                                                </div>
                                                <div className="mt-5 pt-5 border-t border-white/5 grid grid-cols-2 gap-3">
                                                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                                        <p className="text-[8px] text-slate-400 uppercase font-bold mb-1 tracking-wide">Mão de Obra</p>
                                                        <p className="text-sm font-black text-slate-200 font-mono">
                                                            {analysisLevel === 'PROJECT' ? '210K' : analysisLevel === 'STAGE' ? '15K' : '1.1K'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                                        <p className="text-[8px] text-slate-400 uppercase font-bold mb-1 tracking-wide">Equipamentos</p>
                                                        <p className="text-sm font-black text-slate-200 font-mono">
                                                            {analysisLevel === 'PROJECT' ? '240K' : analysisLevel === 'STAGE' ? '17K' : '1.3K'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl flex items-center gap-3 backdrop-blur-sm">
                                            <div className="p-2 bg-primary/30 rounded-lg">
                                                <Activity className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black text-primary uppercase tracking-wider">Informação Operacional</p>
                                                <p className="text-[8px] text-primary/70 font-semibold tracking-tight mt-0.5">Variação de +2% no período do último trecho executado.</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 italic text-xs opacity-30">
                                        Aguardando seleção de ativo...
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    );
};
