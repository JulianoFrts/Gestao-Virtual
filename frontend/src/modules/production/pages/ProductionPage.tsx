import React, { useState, useEffect } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
    permissionsSignal,
    selectedContextSignal
} from "@/signals/authSignals";
import { activeJobs, JobState } from "@/signals/jobSignals";
import { useSignals } from "@preact/signals-react/runtime";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, HardHat, Edit2, Trash2, Loader2, Info, Activity, Upload, Plus, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Database, Filter, AlertCircle, Link2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { orionApi } from "@/integrations/orion/client";
import { TowerProductionData, ProductionCategory, TowerActivityStatus } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import ActivityStatusModal from "../components/ActivityStatusModal";
import TowerFormModal from "../components/TowerFormModal";
import TowerImportModal from "../components/TowerImportModal";
import ActivityImportModal from "../components/ActivityImportModal";
import ExecutionDetailsModal from "../components/ExecutionDetailsModal";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, LayoutGrid } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
// import { ProjectEmptyState } from "@/components/shared/ProjectEmptyState";
import GAPOAnalyticsPanel from "@/components/gapo/GAPOAnalyticsPanel";
import StageFormModal from "@/components/gapo/StageFormModal";
import { StageHeaderSelector } from "../components/StageHeaderSelector";
import GAPOProgressTracker from "@/components/gapo/GAPOProgressTracker";
import { TowerActivityTree } from "../components/TowerActivityTree";
import TowerActivityGoalModal from "../components/TowerActivityGoalModal";
import ActivityPresetsModal from "../components/ActivityPresetsModal";
import { useCompanies } from "@/hooks/useCompanies";
import { Building2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects"; // Necessary for auto-selection logic
import { useSites } from "@/hooks/useSites";
import { useWorkStages, WorkStage } from "@/hooks/useWorkStages";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import { useUsers } from "@/hooks/useUsers";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Memoized Row Component for extreme performance
const ProductionTableRow = React.memo(({
    tower,
    idx,
    categories,
    onDelete,
    onEdit,
    onSelectCell,
    isPending,
    isSelected,
    onToggleSelect,
    onContextMenuCell
}: {
    tower: TowerProductionData;
    idx: number;
    categories: ProductionCategory[] | undefined;
    onDelete: (id: string, name: string) => void;
    onEdit: (tower: TowerProductionData) => void;
    onSelectCell: (cell: {
        towerId: string;
        towerName: string;
        towerType: string | null;
        activityId: string;
        activityName: string;
        status?: TowerActivityStatus;
    }) => void;
    isPending: boolean;
    isSelected: boolean;
    onToggleSelect: (id: string, checked: boolean) => void;
    onContextMenuCell: (e: React.MouseEvent, cell: {
        towerId: string;
        towerName: string;
        towerType: string | null;
        activityId: string;
        activityName: string;
        status?: TowerActivityStatus;
    }) => void;
}) => {
    return (
        <TableRow key={tower.id} className={cn(
            "group/row transition-colors border-b border-amber-900/10",
            idx % 2 === 0 ? "bg-white/1.5" : "bg-transparent",
            isSelected && "bg-primary/10 hover:bg-primary/15"
        )}>
            {/* CHECKBOX CELL */}
             <TableCell className="sticky left-0 w-[40px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-center p-2 transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onToggleSelect(tower.id, checked as boolean)}
                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
            </TableCell>

            {/* ACTION CELLS */}
            <TableCell className="sticky left-[40px] w-[80px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-center p-2 transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-600/30 hover:text-primary hover:bg-primary/10 transition-colors rounded-md"
                        onClick={() => onEdit(tower)}
                    >
                        <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/20 hover:text-destructive hover:bg-destructive/10 transition-colors rounded-md"
                        onClick={() => onDelete(tower.id, tower.objectId)}
                        disabled={isPending}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </TableCell>

            {/* FROZEN DATA CELLS - SWAPPED SEQ AND TORRE */}
            <TableCell className="sticky left-[120px] w-[60px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] font-bold text-center text-primary/60 tracking-wider font-mono transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                {tower.objectSeq || "-"}
            </TableCell>

            <TableCell className="font-black sticky left-[180px] w-[100px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-center text-primary text-xs transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                <span className="font-mono tracking-tighter text-shadow-glow">{tower.objectId}</span>
            </TableCell>

            <TableCell className="sticky left-[280px] w-[120px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] font-bold text-center text-amber-100/40 tracking-wider font-mono transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                {tower.trecho || "-"}
            </TableCell>

            <TableCell className="sticky left-[400px] w-[100px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-center transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                <div className="flex flex-col items-center gap-1">
                    <Badge variant="outline" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border-amber-900/30 text-amber-600/50">
                        {tower.towerType || tower.metadata?.towerType || "Autoportante"}
                    </Badge>
                    {tower.metadata?.tipificacaoEstrutura && (
                        <span className="text-[7px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                            {tower.metadata.tipificacaoEstrutura}
                        </span>
                    )}
                </div>
            </TableCell>

            <TableCell className="sticky left-[500px] w-[100px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] text-center font-bold text-amber-100/20 italic transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                {tower.goForward || "-"}
            </TableCell>

            <TableCell className="sticky left-[600px] w-[100px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] text-center font-bold text-amber-100/20 italic transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                {tower.totalConcreto || "-"}
            </TableCell>

            <TableCell className="sticky left-[700px] w-[100px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] text-center font-bold text-amber-100/20 italic transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.3)] opacity-100">
                {tower.pesoArmacao || "-"}
            </TableCell>

            <TableCell className="sticky left-[800px] w-[100px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] text-center font-bold text-primary italic transition-colors shadow-[4px_0_15px_rgba(0,0,0,0.7)] opacity-100">
                {tower.pesoEstrutura || "-"}
            </TableCell>

            {/* SCROLLING CELLS */}
            {categories?.map(cat => (
                <React.Fragment key={cat.id}>
                    {cat.activities?.map(act => {
                        const status = tower.activityStatuses?.find(s => s.activityId === act.id);
                        const schedule = tower.activitySchedules?.find(s => s.activityId === act.id);

                        let isDelayed = false;
                        if (schedule && schedule.plannedEnd) {
                            const plannedEnd = new Date(schedule.plannedEnd);
                            const now = new Date();

                            if (status && status.status === 'FINISHED' && status.endDate) {
                                // Se terminou, verifica se terminou depois do planejado
                                if (new Date(status.endDate) > plannedEnd) {
                                    isDelayed = true;
                                }
                            } else {
                                // Se não terminou, verifica se já passou da data limite
                                if (now > plannedEnd) {
                                    isDelayed = true;
                                }
                            }
                        }

                        // Helper to format short date
                        const formatShortDate = (dateStr?: string) => {
                            if (!dateStr) return "";
                            try {
                                return format(new Date(dateStr), "dd/MM", { locale: ptBR });
                            } catch (e) {
                                return "";
                            }
                        };

                        return (
                            <TableCell
                                key={act.id}
                                className="p-1 text-center border-r border-amber-900/10 cursor-pointer hover:bg-primary/20 group-hover/row:bg-primary/5 transition-all duration-300"
                                onClick={() => onSelectCell({
                                    towerId: tower.id,
                                    towerName: tower.objectId,
                                    towerType: tower.towerType,
                                    activityId: act.id,
                                    activityName: act.name,
                                    status: status
                                })}
                                onContextMenu={(e) => onContextMenuCell(e, {
                                    towerId: tower.id,
                                    towerName: tower.objectId,
                                    towerType: tower.towerType,
                                    activityId: act.id,
                                    activityName: act.name,
                                    status: status
                                })}
                            >
                                {status || schedule ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-1.5 relative min-h-[52px]">
                                        {status?.requiresApproval && (
                                            <div className="badge-verificar animate-verificar">VERIFICAR</div>
                                        )}

                                        {/* Delay Indicator */}
                                        {isDelayed && (
                                            <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.8)] z-20" title="Atividade Atrasada" />
                                        )}

                                        {/* Blue Progress Bar */}
                                        <div
                                            className={cn(
                                                "absolute bottom-0 left-0 h-0.5 transition-all duration-500 z-10",
                                                isDelayed ? "bg-red-500/80" : "bg-blue-500/80"
                                            )}
                                            style={{ width: `${status?.progressPercent || 0}%` }}
                                        />

                                        {!status || status.status === 'PENDING' ? (
                                            schedule ? (
                                                <div className="flex flex-col items-center gap-0.5 z-10">
                                                    <div className="w-full px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tight shadow-sm bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                                        Programado
                                                    </div>
                                                    <div className="text-[8px] font-bold text-blue-500/60 font-mono tracking-tighter mt-0.5 whitespace-nowrap">
                                                        {formatShortDate(schedule.plannedStart)} | {formatShortDate(schedule.plannedEnd)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="status-pendente w-full px-1.5 py-0.5 rounded text-[11px] font-black uppercase tracking-tight z-10 shadow-sm">
                                                    PENDENTE
                                                </div>
                                            )
                                        ) : (
                                            <div className={cn(
                                                "w-full px-1.5 py-0.5 rounded text-[11px] font-black uppercase tracking-tight z-10 shadow-sm",
                                                status.status === 'FINISHED' ? 'status-concluido' : 'status-andamento',
                                                isDelayed && status.status !== 'FINISHED' && "border border-red-500/50 text-red-100"
                                            )}>
                                                {status.status === 'FINISHED' ? 'CONCLUÍDO' : `AND. ${status.progressPercent}%`}
                                            </div>
                                        )}

                                        {/* Seção Fundiária Separada */}
                                        {status?.landStatus && status.landStatus !== 'FREE' && (
                                            <div className={cn(
                                                "w-full px-1 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-tighter z-10 border",
                                                status.landStatus === 'EMBARGO' ? 'bg-red-950/40 text-red-500 border-red-500/50' :
                                                    'bg-orange-950/40 text-orange-500 border-orange-500/50'
                                            )}>
                                                {status.landStatus === 'EMBARGO' ? 'EMBARGO' : 'IMPEDIMENTO'}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5 z-10 mt-0.5">
                                            {status?.metadata?.leadName && status.metadata.leadName !== 'none' && (
                                                <span className="text-[8px] font-bold text-amber-500/80 uppercase tracking-tighter">
                                                    {status.metadata.leadName.split(' ')[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4 flex items-center justify-center opacity-10 relative">
                                        {/* Handle case where no status but schedule exists and is delayed (not started but late) */}
                                        {isDelayed && (
                                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.8)] z-20" title="Não Iniciado - Atrasado" />
                                        )}
                                        <div className="w-1 h-1 rounded-full bg-foreground" />
                                    </div>
                                )}
                            </TableCell>
                        );
                    })}
                </React.Fragment>
            ))}
        </TableRow>
    );
});

ProductionTableRow.displayName = "ProductionTableRow";

const ProductionPage = () => {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    useSignals();
    const selectedContext = selectedContextSignal.value;
    const selectedCompanyId = selectedContext?.companyId || 'all';
    const selectedProjectId = selectedContext?.projectId || 'all';
    const selectedSiteId = selectedContext?.siteId || 'all';

    const [activeTab, setActiveTab] = useState("grid");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCell, setSelectedCell] = useState<{
        towerId: string;
        towerName: string;
        towerType: string | null;
        activityId: string;
        activityName: string;
        status?: TowerActivityStatus;
    } | null>(null);

    const [isTowerModalOpen, setIsTowerModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isActivityImportModalOpen, setIsActivityImportModalOpen] = useState(false);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<any>(null);
    const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
    const [parentGoalId, setParentGoalId] = useState<string | null>(null);

    // Modular Data: Activities/Goals Hierarchy
    const { data: activitiesHierarchy, isLoading: isLoadingActivities } = useQuery<any[]>({
        queryKey: ['tower-activity-goals', selectedProjectId],
        queryFn: async () => {
            if (selectedProjectId === 'all') return [];
            const response = await orionApi.get<any>(`/tower-activity-goals?projectId=${selectedProjectId}`);
            // Garantir que retornamos um array (res.data.data ou res.data)
            const result = response.data?.data || response.data || [];
            return Array.isArray(result) ? result : [];
        },
        enabled: selectedProjectId !== 'all'
    });
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [editingTower, setEditingTower] = useState<TowerProductionData | null>(null);
    const [editingStage, setEditingStage] = useState<WorkStage | null>(null);
    const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
    const [executionModalData, setExecutionModalData] = useState<{
        towerId: string;
        towerName: string;
        activityId: string;
        activityName: string;
        status?: TowerActivityStatus;
        towerType?: string | null;
    } | null>(null);
    
    // Derived state for queries
    const projectId = selectedProjectId;
    const companyId = selectedCompanyId === 'all' ? undefined : selectedCompanyId;

    const [sortConfig, setSortConfig] = useState<{ key: keyof TowerProductionData; direction: "asc" | "desc" } | null>({ key: "objectSeq", direction: "asc" });
    const [selectedMetaMae, setSelectedMetaMae] = useState<string>("all");

    // Hooks
    const { companies, isLoading: isLoadingCompanies } = useCompanies();
    const { projects, isLoading: isLoadingProjects } = useProjects();

    // Hooks for Analytics Tabs
    const { sites, isLoading: isLoadingSites } = useSites(projectId !== 'all' ? projectId : undefined);

    const { 
        data: towersData, 
        isLoading: loadingTowers,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ["production-towers", projectId, companyId, selectedSiteId],
        queryFn: async ({ pageParam = 1 }) => {
             const params = new URLSearchParams();

             if (projectId && projectId !== 'all') params.append('projectId', projectId);
             if (companyId) params.append('companyId', companyId);
             if (selectedSiteId && selectedSiteId !== 'all') params.append('siteId', selectedSiteId);
             params.append('page', pageParam.toString());
             params.append('limit', '1000'); 
             
            const response = await orionApi.get(`/production/tower-status?${params.toString()}`);
            const payloadData = response.data as any;
            
            let dataArray: any[] = [];
            if (Array.isArray(payloadData)) {
                dataArray = payloadData;
            } else if (payloadData && typeof payloadData === 'object') {
                if (Array.isArray(payloadData.data)) {
                    dataArray = payloadData.data;
                } else if (payloadData.data && Array.isArray(payloadData.data.data)) {
                    dataArray = payloadData.data.data;
                } else if (Array.isArray(payloadData.items)) {
                    dataArray = payloadData.items;
                }
            }
            
            return dataArray as TowerProductionData[];
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            return (lastPage?.length === 1000) ? allPages.length + 1 : undefined;
        },
        enabled: !!companyId || !!profile?.companyId
    });

    const towers = React.useMemo(() => {
        return towersData?.pages.flat().filter((t): t is TowerProductionData => !!t) || [];
    }, [towersData]);

    const observerTarget = React.useRef<HTMLDivElement>(null);
    const fetchLock = React.useRef(false);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            async (entries) => {
                const target = entries[0];
                if (target.isIntersecting && hasNextPage && !isFetchingNextPage && !fetchLock.current) {
                    fetchLock.current = true;
                    await fetchNextPage();
                    // Optional tiny delay to let react render new height
                    setTimeout(() => { fetchLock.current = false; }, 300);
                }
            },
            { 
               root: null, 
               threshold: 0.1, 
               rootMargin: '200px' // Restore to moderate threshold
            }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
            observer.disconnect();
        };
    }, [observerTarget, fetchNextPage, hasNextPage, isFetchingNextPage]);

    const { data: productionCategories = [], isLoading: loadingCategories } = useQuery({
        queryKey: ['production-categories'],
        queryFn: async () => {
            const res = await orionApi.get('/production/categories');
            return res.data as ProductionCategory[];
        }
    });

    const { stages, createStage, updateStage, deleteStage, isLoading: isLoadingStages } = useWorkStages(selectedSiteId === 'all' ? undefined : selectedSiteId, selectedProjectId);
    const { records, isLoading: isLoadingRecords } = useTimeRecords();
    const { users, isLoading: isLoadingUsers } = useUsers();

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await orionApi.post('/tower-production/delete', { ids: [id] });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
            toast.success("Torre removida com sucesso");
        },
        onError: (error: Error) => {
            toast.error("Erro ao remover torre: " + (error instanceof Error ? error.message : "Erro desconhecido"));
        }
    });

    const [selectedTowers, setSelectedTowers] = useState<string[]>([]);
    const [isBulkLinking, setIsBulkLinking] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const handleToggleSelect = React.useCallback((id: string, checked: boolean) => {
        setSelectedTowers(prev => checked ? [...prev, id] : prev.filter(p => p !== id));
    }, []);

    const handleSelectAll = (checked: boolean) => {
        if (checked && filteredTowers) {
            setSelectedTowers(filteredTowers.map(t => t.id));
        } else {
            setSelectedTowers([]);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedTowers.length === 0) return;
        setIsBulkDeleting(true);
        try {
            await orionApi.post('/tower-production/delete', { ids: selectedTowers });
            toast.success(`${selectedTowers.length} torres removidas com sucesso`);
            setSelectedTowers([]);
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
        } catch {
            toast.error("Erro ao remover torres");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!towers || towers.length === 0) return;
        setIsBulkDeleting(true);
        try {
            await orionApi.post('/tower-production/delete', { projectId: selectedProjectId });
            toast.success("Todas as torres foram removidas com sucesso");
            setSelectedTowers([]);
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
        } catch {
            toast.error("Erro ao remover todas as torres");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Monitoramento reativo de jobs para atualização automática do grid
    const jobs = activeJobs.value;
    const prevJobsCountRef = React.useRef(0);

    React.useEffect(() => {
        const jobsList = Object.values(jobs) as JobState[];
        const towerImportJobs = jobsList.filter(j => j.type === 'TOWER_IMPORT');
        
        // Verifica se algum job de importação acabou de ser concluído
        const hasCompletedJob = towerImportJobs.some(j => j.status === 'completed');
        
        if (hasCompletedJob) {
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
            queryClient.invalidateQueries({ queryKey: ['tower-activity-goals'] });
        }
    }, [jobs, queryClient]);

    const handleBulkUnlink = async () => {
        if (!stages || stages.length === 0) return;
        if (!window.confirm("Isso irá desativar a visualização de TODAS as etapas no Mapa. Os dados serão mantidos. Deseja continuar?")) return;

        setIsBulkDeleting(true); // Reuse loading state
        try {
            for (const s of stages) {
                await updateStage(s.id, { 
                    metadata: { ...s.metadata, mapEnabled: false } 
                });
                await new Promise(resolve => setTimeout(resolve, 150)); // Throttling
            }
            toast.success("Visualização de todas as etapas desativada.");
        } catch {
            toast.error("Erro ao desativar visualização.");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleBulkAutoLink = async () => {
        if (!stages || !productionCategories || stages.length === 0) {
            console.warn("[BulkLink] Dados insuficientes para vincular:", { stages: !!stages, cats: !!productionCategories });
            return;
        }

        setIsBulkLinking(true);
        console.log("[BulkLink] Iniciando vínculo em lote para", stages.length, "etapas");

        try {
            const categories = productionCategories;
            const normalize = (s: string) => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
            
            let matchCount = 0;
            for (const stage of stages) {
                let matchId = '';
                const targetName = normalize(stage.name);

                for (const cat of categories) {
                    // 1. Tenta achar match na lista de sub-atividades (Prioridade)
                    if (cat.activities) {
                        const match = cat.activities.find(a => normalize(a.name) === targetName);
                        if (match) {
                            matchId = match.id;
                            break;
                        }
                    }

                    // 2. Se o nome da etapa bate com a CATEGORIA, procura uma atividade idêntica dentro dela
                    if (normalize(cat.name) === targetName) {
                        const directMatch = cat.activities?.find(a => normalize(a.name) === targetName);
                        if (directMatch) {
                            matchId = directMatch.id;
                        } else if (cat.activities?.length === 1) {
                            // Heurística: se a categoria só tem UMA atividade, podemos sugerir o vínculo?
                            // Por enquanto, vamos ser conservadores e não vincular se os nomes não baterem.
                            // matchId = cat.activities[0].id; 
                        }
                        if (matchId) break;
                    }
                }
                
                if (matchId && matchId !== 'none') {
                   const needsUpdate = stage.productionActivityId !== matchId || stage.metadata?.mapEnabled !== true;
                   
                   if (needsUpdate) {
                       console.log(`[BulkLink] Vinculando "${stage.name}" -> ID ${matchId}`);
                       matchCount++;
                       await updateStage(stage.id, { 
                           productionActivityId: matchId,
                           metadata: { ...stage.metadata, mapEnabled: true }
                       });
                       await new Promise(resolve => setTimeout(resolve, 150));
                   }
                }
            }

            if (matchCount > 0) {
                 toast.success(`${matchCount} etapas vinculadas automaticamente.`);
            } else {
                 toast.info("Nenhuma nova vinculação necessária.");
            }
        } catch (error) {
            console.error("[BulkLink] Erro fatal:", error);
            toast.error("Erro ao realizar vínculo automático.");
        } finally {
            setIsBulkLinking(false);
        }
    };

    const unlinkedStagesCount = React.useMemo(() => 
        stages?.filter(s => !s.productionActivityId).length && 0   , [stages]);

    // Transform WorkStages into the structure expected by the Grid
    const stageColumns = React.useMemo<ProductionCategory[] | undefined>(() => {
        if (!stages || stages.length === 0) return undefined;

        console.log("[stageColumns] Transformando etapas:", stages.length);

        // 1. Identificar nomes das metas existentes para filtragem estrita
        const activeGoalNames = new Set<string>();
        const collectGoalNames = (nodes: any[]) => {
            if (!Array.isArray(nodes)) return;
            nodes.forEach(node => {
                if (node.name) activeGoalNames.add(node.name.trim().toUpperCase());
                if (node.children) collectGoalNames(node.children);
            });
        };
        if (activitiesHierarchy) collectGoalNames(activitiesHierarchy);

        // 2. Identify Parents (Categories) and Children (Activities)
        // Ensure numeric sort for displayOrder and filter by active goals
        const parents = (stages || [])
            .filter(s => s && !s.parentId && s.name && activeGoalNames.has(s.name.trim().toUpperCase()))
            .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
        
        const filteredParents = parents.filter(p => 
            selectedMetaMae === 'all' || p.name === selectedMetaMae
        );

        const children = (stages || []).filter(s => s && s.parentId && s.name && activeGoalNames.has(s.name.trim().toUpperCase()));

        // 2. Map to grid structure
        return filteredParents.map((p, idx) => {
            let catActivities = children
                .filter(c => c.parentId === p.id)
                .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0))
                .map((c, actIdx) => ({
                    id: c.productionActivityId || 'custom-' + c.id,
                    categoryId: p.id,
                    name: c.name,
                    description: null,
                    weight: c.weight,
                    order: actIdx,
                    stageId: c.id,
                    productionActivityId: c.productionActivityId,
                    metadata: c.metadata
                }));

            // FIX: Se não houver filhos, tratamos a própria etapa pai como uma coluna (Etapa Plana)
            if (catActivities.length === 0) {
                catActivities = [{
                    id: p.productionActivityId || 'custom-' + p.id,
                    categoryId: p.id,
                    name: p.name,
                    description: p.description,
                    weight: p.weight,
                    order: 0,
                    stageId: p.id,
                    productionActivityId: p.productionActivityId,
                    metadata: p.metadata
                }];
            }

            return {
                id: p.id,
                name: p.name,
                description: p.description || null,
                order: idx,
                activities: catActivities
            };
        }).filter(cat => cat.activities.length > 0);
    }, [stages, selectedMetaMae, activitiesHierarchy]);
    



    const requestSort = (key: keyof TowerProductionData) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedTowers = React.useMemo(() => {
        if (!towers) return [];
        const sortableItems = towers.filter(Boolean);
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (!a || !b) return 0;
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === "asc" ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === "asc" ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [towers, sortConfig]);

    const filteredTowers = sortedTowers?.filter(tower => {
        if (!tower) return false;
        const objectId = tower.objectId?.toLowerCase() || "";
        const trecho = tower.trecho?.toLowerCase() || "";
        const search = searchTerm.toLowerCase();
        return objectId.includes(search) || trecho.includes(search);
    });

    const [scrollWidth, setScrollWidth] = useState(0);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const topScrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const updateWidth = () => {
            if (scrollContainerRef.current) {
                const width = scrollContainerRef.current.scrollWidth;
                setScrollWidth(width);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);

        // Timeout robusto para garantir que o DOM renderizou
        const timer = setTimeout(updateWidth, 1000);
        const interval = setInterval(updateWidth, 3000);

        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [filteredTowers, stageColumns]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;

        if (target === scrollContainerRef.current && topScrollRef.current) {
            topScrollRef.current.scrollLeft = target.scrollLeft;
        } else if (target === topScrollRef.current && scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = target.scrollLeft;
        }
    };

    const handleDeleteTower = React.useCallback((id: string, name: string) => {
        if (window.confirm(`Deseja realmente excluir a torre ${name}?`)) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const handleEditTower = React.useCallback((tower: TowerProductionData) => {
        setEditingTower(tower);
        setIsTowerModalOpen(true);
    }, []);

    const handleSelectCell = React.useCallback((cell: {
        towerId: string;
        towerName: string;
        activityId: string;
        activityName: string;
        status?: TowerActivityStatus;
        towerType: string | null;
    }) => {
        setSelectedCell(cell);
    }, []);

    const handleContextMenuCell = React.useCallback((e: React.MouseEvent, cell: {
        towerId: string;
        towerName: string;
        activityId: string;
        activityName: string;
        status?: TowerActivityStatus;
        towerType: string | null;
    }) => {
        e.preventDefault(); // Prevent browser context menu
        setExecutionModalData(cell);
        setIsExecutionModalOpen(true);
    }, []);

    // Helper to update notes from ExecutionModal
    const handleSaveExecutionNotes = async (notes: string) => {
        if (!executionModalData) return;
        
        const current = executionModalData.status;

        // Use cached data to construct payload, only updating notes
        const payload = {
            elementId: executionModalData.towerId,
            activityId: executionModalData.activityId,
            status: current?.status || 'PENDING',
            landStatus: current?.landStatus || 'FREE',
            impedimentType: current?.impedimentType || 'NONE',
            foremanName: current?.metadata?.leadName || null,
            progressPercent: current?.progressPercent || 0,
            startDate: current?.startDate,
            endDate: current?.endDate,
            notes: notes,
            requiresApproval: false,
            metadata: current?.metadata
        };

        await orionApi.post("/production/tower-status", payload);
        toast.success("Notas atualizadas com sucesso");
        queryClient.invalidateQueries({ queryKey: ["production-towers"] });
    };

    // Removido o bloqueio global de isAppLoading para dar mais agilidade à UI
    // O esqueleto da página (Header/Tabs) agora renderiza imediatamente.

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden font-sans">
            {/* App Header - Fixed */}
            <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-background/95 backdrop-blur-xl z-50 shadow-2xl relative">
                <div className="flex items-center gap-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full mr-2"
                        title="Voltar ao Início"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-linear-to-r from-primary via-primary to-primary/40 bg-clip-text text-transparent uppercase italic drop-shadow-sm">
                                GESTÃO DE PRODUÇÃO
                            </h1>
                            {(loadingTowers || loadingCategories || isLoadingCompanies || isLoadingProjects) && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Sincronizando</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-8 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.6)]" />
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em]">Controle Técnico e Planejamento</p>
                        </div>
                    </div>
                </div>


                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Card className="glass-card bg-primary/5 hover:bg-primary/10 group relative overflow-hidden h-14 flex items-center px-5 gap-4 border-primary/20">
                            <div className="p-2.5 rounded-2xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500">
                                <HardHat className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors">Inventário Total</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black tracking-tighter italic text-foreground text-shadow-glow">
                                        {towers?.length || 0}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Torres</span>
                                </div>
                            </div>
                        </Card>

                        <div className="h-8 w-px bg-white/10 mx-2" />

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full"
                        >
                            <Info className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Toolbar - Fixed at Top (Locked) */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="shrink-0 z-40 bg-background/95 backdrop-blur-xl border-b border-white/5 py-4 px-6 shadow-xl space-y-3">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                        <TabsList className="glass-card p-1 flex justify-start w-fit bg-secondary/20">
                            <TabsTrigger value="grid" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <LayoutGrid className="w-4 h-4" /> Torres (Produção)
                            </TabsTrigger>
                            <TabsTrigger value="activities" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <Activity className="w-4 h-4" /> Atividades/Metas
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                            {activeTab === 'grid' && (
                                <div className="flex items-center gap-3 w-full sm:w-80">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            placeholder="Localizar torre ou trecho..."
                                            className="pl-9 bg-black/40 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 h-9 text-xs transition-all rounded-lg text-foreground placeholder:text-muted-foreground/30 font-medium"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {/* Meta Mae Filter */}
                                    <Select value={selectedMetaMae} onValueChange={setSelectedMetaMae}>
                                        <SelectTrigger className="w-[200px] h-9 bg-black/40 border-white/10 text-xs font-bold uppercase tracking-wider text-primary/80 transition-all rounded-lg focus:ring-1 focus:ring-primary/20">
                                            <div className="flex items-center gap-2 truncate">
                                                <Filter className="w-3.5 h-3.5 text-primary/60" />
                                                <SelectValue placeholder="Filtrar Etapa" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-950 border-white/10">
                                            <SelectItem value="all" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
                                                Todas as Etapas
                                            </SelectItem>
                                            {stages?.filter(s => !s.parentId).map(parent => (
                                                <SelectItem key={parent.id} value={parent.name} className="text-xs font-bold uppercase tracking-widest text-primary/80">
                                                    {parent.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {activeTab === 'grid' && (
                                    <>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 border-primary/20 hover:bg-primary/10 glass text-foreground font-bold h-9 px-4 rounded-lg flex-1 sm:flex-none uppercase text-[10px] tracking-wider"
                                                    disabled={isBulkDeleting}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5 text-primary" />
                                                    Configurar
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 bg-slate-950 border-slate-800">
                                                <DropdownMenuLabel>Gestão de Etapas</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => { setEditingStage(null); setIsStageModalOpen(true); }} className="cursor-pointer">
                                                    <Plus className="mr-2 h-4 w-4" /> Criar/Editar Etapas
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-800" />
                                                <DropdownMenuLabel>Mapa Visual (Vínculos)</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={handleBulkAutoLink} className="cursor-pointer" disabled={isBulkLinking}>
                                                    {isBulkLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4 text-green-500" />}
                                                    Auto-Vincular Todas
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={handleBulkUnlink} className="cursor-pointer text-red-500 focus:text-red-500">
                                                    <Trash2 className="mr-2 h-4 w-4" /> 
                                                    Desvincular Todas
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 border-primary/20 hover:bg-primary/10 glass text-foreground font-bold h-9 px-4 rounded-lg flex-1 sm:flex-none uppercase text-[10px] tracking-wider"
                                            onClick={() => {
                                                if (activeTab === 'grid') setIsImportModalOpen(true);
                                                else setIsActivityImportModalOpen(true);
                                            }}
                                        >
                                            <Upload className="h-3.5 w-3.5 text-primary" />
                                            Importar {activeTab === 'grid' ? 'Torres' : 'Atividades'}
                                        </Button>

                                        {/* BULK ACTIONS */}
                                        {selectedTowers.length > 0 && (
                                            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="sm" className="gap-2 h-9 px-4 rounded-lg uppercase text-[10px] tracking-wider font-bold" disabled={isBulkDeleting}>
                                                            {isBulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                            Excluir ({selectedTowers.length})
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Tem certeza que deseja excluir <b>{selectedTowers.length}</b> torres selecionadas?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                                                                Excluir
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                        
                                        {!selectedTowers.length && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="sm" className="gap-2 h-9 px-4 rounded-lg uppercase text-[10px] tracking-wider font-bold text-destructive hover:bg-destructive/10" disabled={isBulkDeleting}>
                                                        <Trash2 className="w-3 h-3" />
                                                        Excluir Tudo
                                                    </Button>
                                                </AlertDialogTrigger>
                                                 <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-destructive">PERIGO: Excluir TODO o Projeto?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Você está prestes a excluir <b>TODAS AS TORRES</b> deste projeto.<br/><br/>
                                                            Quantidade: <b>{towers?.length || 0} torres</b>.<br/><br/>
                                                            Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                                                            Sim, Excluir TUDO
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}

                                        <Button
                                            size="sm"
                                            className="gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-95 gradient-primary border-none text-primary-foreground font-black uppercase tracking-wider h-9 px-4 rounded-lg flex-1 sm:flex-none text-[10px]"
                                            onClick={() => {
                                                setEditingTower(null);
                                                setIsTowerModalOpen(true);
                                            }}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Nova Torre
                                        </Button>
                                    </>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-primary/30 hover:bg-primary/10 text-primary font-bold h-9 px-4 rounded-lg flex-1 sm:flex-none uppercase text-[10px] tracking-wider"
                                    onClick={() => navigate('/producao/projeto')}
                                >
                                    <Database className="h-3.5 w-3.5" />
                                    Dados Técnicos
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-sky-500/30 hover:bg-sky-500/10 text-sky-400 font-bold h-9 px-4 rounded-lg flex-1 sm:flex-none uppercase text-[10px] tracking-wider"
                                    onClick={() => navigate('/producao/analytics')}
                                >
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Analytics & Custos
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content - Full Screen Layout */}
                <main className="flex-1 flex flex-col overflow-hidden relative bg-black/20">
                    <TabsContent value="grid" className="h-full flex flex-col data-[state=active]:flex">
                        {loadingTowers ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                            </div>
                        ) : !towers || towers.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center p-8 h-[60vh]">
                            <div className="flex-1 flex flex-col items-center justify-center p-8 h-[60vh] text-center space-y-4">
                                <div className="text-xl font-bold text-muted-foreground">Nenhuma Torre Cadastrada</div>
                                <p className="text-sm text-muted-foreground/60 max-w-md">Esta obra ainda não possui torres ou atividades técnicas. Você pode importar uma planilha Excel ou cadastrar manualmente.</p>
                                <div className="flex gap-4">
                                    <Button onClick={() => setIsTowerModalOpen(true)}>Nova Torre</Button>
                                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>Importar Excel</Button>
                                </div>
                            </div>
                            </div>
                        ) : (
                            <>
                                {unlinkedStagesCount > 0 && (
                                    <div className="px-6 py-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-500 border-2 rounded-2xl flex items-center justify-between p-4 px-6 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-amber-500/20 rounded-xl">
                                                    <Link2 className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <AlertTitle className="text-sm font-black uppercase tracking-widest mb-1 italic">Vínculo de Atividades Necessário</AlertTitle>
                                                    <AlertDescription className="text-xs font-bold opacity-80 uppercase tracking-tight">
                                                        Existem <span className="text-white font-black">{unlinkedStagesCount} etapas</span> que ainda não estão conectadas ao seu catálogo de metas.
                                                    </AlertDescription>
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={handleBulkAutoLink}
                                                disabled={isBulkLinking}
                                                className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-tighter px-6 h-11 rounded-xl shadow-lg transition-all hover:scale-[1.05]"
                                            >
                                                {isBulkLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                                                Vincular Todas Automaticamente
                                            </Button>
                                        </Alert>
                                    </div>
                                )}
                                {/* Componente de Liderança - Premium Look */}


                                {/* Top Sync Scrollbar Container */}
                                <div
                                    ref={topScrollRef}
                                    onScroll={handleScroll}
                                    className="overflow-x-auto h-2 bg-background/80 border-b border-primary/20 shrink-0 scrollbar-thin scrollbar-thumb-primary/60 scrollbar-track-transparent z-50"
                                >
                                    <div style={{ width: scrollWidth || '3000px' }} className="h-full" />
                                </div>

                                {/* Table Area - Fills height, horizontal scroll starts from column Torre (T) visually */}
                                <div
                                    className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-amber-600/40 scrollbar-track-amber-900/5 bg-[#0a0806] select-none"
                                    ref={scrollContainerRef}
                                    onScroll={handleScroll}
                                >
                                    <Table className="border-separate border-spacing-0 w-full min-w-max">
                                        <TableHeader className="sticky top-0 z-50 shadow-2xl">
                                            <TableRow className="bg-[#0a0806] hover:bg-[#0a0806] border-b border-amber-900/30">
                                                {/* FROZEN HEADERS */}
                                                {/* FROZEN HEADERS - SHIFTED FOR CHECKBOX */}
                                                <TableHead className="w-[40px] h-14 sticky left-0 top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 text-center font-black uppercase text-[10px] tracking-widest text-foreground p-0">
                                                     <div className="flex items-center justify-center w-full h-full">
                                                        <Checkbox
                                                            checked={filteredTowers && filteredTowers.length > 0 && selectedTowers.length === filteredTowers.length}
                                                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                                            className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                                        />
                                                     </div>
                                                </TableHead>

                                                <TableHead className="w-[80px] h-14 sticky left-[40px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 text-center font-black uppercase text-[10px] tracking-widest text-foreground">
                                                    MENU
                                                </TableHead>

                                                <TableHead
                                                    className={cn(
                                                        "w-[60px] h-14 sticky left-[120px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
                                                        sortConfig?.key === 'objectSeq' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('objectSeq')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">SEQ</span>
                                                        {sortConfig?.key === 'objectSeq' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform origin-left",
                                                        sortConfig?.key === 'objectSeq' ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                                    )} />
                                                </TableHead>

                                                <TableHead
                                                    className={cn(
                                                        "w-[100px] h-14 sticky left-[180px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
                                                        sortConfig?.key === 'objectId' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('objectId')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">TORRE</span>
                                                        {sortConfig?.key === 'objectId' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform origin-left",
                                                        sortConfig?.key === 'objectId' ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                                    )} />
                                                </TableHead>

                                                <TableHead
                                                    className={cn(
                                                        "w-[120px] h-14 sticky left-[280px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
                                                        sortConfig?.key === 'trecho' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('trecho')}
                                                >
                                                    <div className="flex items-center justify-center gap-2 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">SUBTRECHO</span>
                                                        {sortConfig?.key === 'trecho' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform origin-left",
                                                        sortConfig?.key === 'trecho' ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                                    )} />
                                                </TableHead>

                                                <TableHead
                                                    className={cn(
                                                        "w-[100px] h-14 sticky left-[400px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
                                                        sortConfig?.key === 'towerType' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('towerType')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">ESTRUTURA</span>
                                                        {sortConfig?.key === 'towerType' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform origin-left",
                                                        sortConfig?.key === 'towerType' ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                                    )} />
                                                </TableHead>

                                                <TableHead
                                                    className={cn(
                                                        "w-[100px] h-14 sticky left-[500px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
                                                        sortConfig?.key === 'goForward' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('goForward')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">VÃO (M)</span>
                                                        {sortConfig?.key === 'goForward' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform origin-left",
                                                        sortConfig?.key === 'goForward' ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                                    )} />
                                                </TableHead>

                                                <TableHead
                                                    className={cn(
                                                        "w-[100px] h-14 sticky left-[600px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
                                                        sortConfig?.key === 'totalConcreto' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('totalConcreto')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">VOL (M³)</span>
                                                        {sortConfig?.key === 'totalConcreto' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform origin-left",
                                                        sortConfig?.key === 'totalConcreto' ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                                    )} />
                                                </TableHead>

                                                <TableHead
                                                    className={cn(
                                                        "w-[100px] h-14 sticky left-[700px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
                                                        sortConfig?.key === 'pesoArmacao' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('pesoArmacao')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">AÇO (KG)</span>
                                                        {sortConfig?.key === 'pesoArmacao' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform origin-left",
                                                        sortConfig?.key === 'pesoArmacao' ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                                    )} />
                                                </TableHead>

                                                <TableHead
                                                    className={cn(
                                                        "w-[100px] h-14 sticky left-[800px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[4px_0_15px_rgba(0,0,0,0.7)] opacity-100",
                                                        sortConfig?.key === 'pesoEstrutura' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('pesoEstrutura')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">ESTRUTURA (T)</span>
                                                        {sortConfig?.key === 'pesoEstrutura' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-transform origin-left",
                                                        sortConfig?.key === 'pesoEstrutura' ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                                    )} />
                                                </TableHead>

                                                {/* SCROLLING HEADERS */}
                                                {stageColumns?.map(cat => (
                                                    <React.Fragment key={cat.id}>
                                                        {cat.activities?.map(act => (
                                                            <TableHead key={act.id} className="min-w-[160px] h-14 bg-[#0a0806] z-40 sticky top-0 text-center border-r border-amber-900/10 font-black text-[10px] uppercase tracking-widest text-[#d4af37]/80 group hover:bg-[#1a1612] transition-colors opacity-100 p-0">
                                                                <div className="w-full h-full flex flex-col justify-center">
                                                                    <div className="w-full text-center py-1 bg-[#1a1612]/50 border-b border-white/5">
                                                                        <span className="text-amber-600/40 text-[8px] font-bold tracking-[0.2em] leading-none">{(cat.name || '').toUpperCase()}</span>
                                                                    </div>
                                                                    <StageHeaderSelector
                                                                        stage={{
                                                                            id: act.stageId || act.id, // Use correct Stage ID
                                                                            name: act.name,
                                                                            // Mocking missing props since `act` is a subset of WorkStage in this transform
                                                                            siteId: selectedSiteId || '',
                                                                            parentId: cat.id,
                                                                            description: null,
                                                                            weight: act.weight,
                                                                            displayOrder: 0,
                                                                            createdAt: new Date().toISOString() as any, // Cast to any or string to avoid type conflict if strict
                                                                            // This is the CRITICAL part: we need to pass the productionActivityId if it exists
                                                                            productionActivityId: act.productionActivityId, // Assuming logic below adds this
                                                                            metadata: act.metadata
                                                                        }}
                                                                        onUpdate={async (stageId, payload) => {
                                                                            // Payload can be { productionActivityId } or { metadata } or both
                                                                            await updateStage(stageId, payload);
                                                                            // Invalidate queries to refresh columns
                                                                        }}
                                                                        onEdit={() => {
                                                                            // We need to construct a full WorkStage object or at least enough for specific edit
                                                                            // Ideally we find the real object from "stages" array using ID
                                                                            const realStage = stages?.find(s => s.id === (act.stageId || act.id));
                                                                            if (realStage) {
                                                                                setEditingStage(realStage);
                                                                                setIsStageModalOpen(true);
                                                                            }
                                                                        }}
                                                                        onDelete={async () => {
                                                                            const idToDelete = act.stageId || act.id;
                                                                            if (window.confirm(`Tem certeza que deseja excluir a etapa "${act.name}"?`)) {
                                                                                 await deleteStage(idToDelete);
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                                            </TableHead>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {filteredTowers?.map((tower, idx) => (
                                                <ProductionTableRow
                                                    key={tower.id}
                                                    tower={tower}
                                                    idx={idx}
                                                    categories={stageColumns as any}
                                                    onDelete={handleDeleteTower}
                                                    onEdit={handleEditTower}
                                                    onSelectCell={handleSelectCell}
                                                    isPending={deleteMutation.isPending}
                                                    isSelected={selectedTowers.includes(tower.id)}
                                                    onToggleSelect={handleToggleSelect}
                                                    onContextMenuCell={handleContextMenuCell}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                    
                                    {/* Infinite Scroll trigger */}
                                    <div ref={observerTarget} className="h-4 w-full" />
                                    {isFetchingNextPage && (
                                        <div className="py-4 flex justify-center text-muted-foreground text-sm font-bold items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Carregando mais torres...
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="activities" className="h-full overflow-auto bg-[#0a0806]/50">
                        <TowerActivityTree 
                            data={(activitiesHierarchy || []) as any[]} 
                            onMove={async (id, parentId, order) => {
                                await orionApi.patch('/tower-activity-goals', { id, parentId, order });
                                queryClient.invalidateQueries({ queryKey: ['tower-activity-goals'] });
                            }}
                            onEdit={(node) => {
                                setEditingGoal(node);
                                setIsActivityModalOpen(true);
                            }}
                            onDelete={async (id) => {
                                if (window.confirm("Excluir esta atividade e todas as suas sub-atividades?")) {
                                    await orionApi.delete(`/tower-activity-goals?id=${id}`);
                                    queryClient.invalidateQueries({ queryKey: ['tower-activity-goals'] });
                                }
                            }}
                            onCreate={(parentId) => {
                                setEditingGoal(null);
                                setParentGoalId(parentId);
                                setIsActivityModalOpen(true);
                            }}
                            onOpenPresets={() => setIsPresetsModalOpen(true)}
                        />
                    </TabsContent>
                </main>
            </Tabs>

            {
                selectedCell && (
                    <ActivityStatusModal
                        isOpen={!!selectedCell}
                        onClose={() => setSelectedCell(null)}
                        elementId={selectedCell.towerId}
                        towerName={selectedCell.towerName}
                        towerType={selectedCell.towerType}
                        activityId={selectedCell.activityId}
                        activityName={selectedCell.activityName}
                        currentStatus={selectedCell.status}
                        projectId={projectId}
                    />
                )
            }

            {executionModalData && (
                <ExecutionDetailsModal
                    isOpen={isExecutionModalOpen}
                    onClose={() => setIsExecutionModalOpen(false)}
                    towerName={executionModalData.towerName}
                    activityName={executionModalData.activityName}
                    statusData={executionModalData.status}
                    onSaveNotes={handleSaveExecutionNotes}
                />
            )}

            <TowerFormModal
                isOpen={isTowerModalOpen}
                onClose={() => setIsTowerModalOpen(false)}
                projectId={projectId!}
                tower={editingTower}
            />

            <TowerImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                projectId={projectId!}
                companyId={selectedCompanyId}
                siteId={selectedSiteId}
            />

            <TowerActivityGoalModal
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                projectId={selectedProjectId}
                companyId={selectedCompanyId}
                editingGoal={editingGoal}
                parentId={parentGoalId}
            />

            <ActivityPresetsModal
                isOpen={isPresetsModalOpen}
                onClose={() => setIsPresetsModalOpen(false)}
                projectId={selectedProjectId}
                companyId={selectedCompanyId}
                siteId={selectedSiteId}
            />

            <ActivityImportModal 
                isOpen={isActivityImportModalOpen}
                onClose={() => {
                    setIsActivityImportModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["tower-activity-goals"] });
                }}
                projectId={projectId!}
            />

            <StageFormModal
                isOpen={isStageModalOpen}
                onClose={() => { setIsStageModalOpen(false); setEditingStage(null); }}
                stage={editingStage}
                onSave={async (data) => {
                    try {
                        if (editingStage) {
                            return await updateStage(editingStage.id, data);
                        } else {
                            return await createStage(data);
                        }
                    } catch (error) {
                        return { success: false };
                    }
                }}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['work-stages'] })}
            />

        </div >
    );
};

export default ProductionPage;
