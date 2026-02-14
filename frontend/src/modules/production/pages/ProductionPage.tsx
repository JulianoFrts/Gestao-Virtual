import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, HardHat, Edit2, Trash2, Loader2, Info, Activity, Upload, Plus, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { orionApi } from "@/integrations/orion/client";
import { TowerProductionData, ProductionCategory, TowerActivityStatus } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import ActivityStatusModal from "../components/ActivityStatusModal";
import TowerFormModal from "../components/TowerFormModal";
import ExcelImportModal from "../components/ExcelImportModal";
import ExecutionDetailsModal from "../components/ExecutionDetailsModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, LayoutGrid } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { ProjectEmptyState } from "@/components/shared/ProjectEmptyState";
import GAPOAnalyticsPanel from "@/components/gapo/GAPOAnalyticsPanel";
import StageFormModal from "@/components/gapo/StageFormModal";
import { StageHeaderSelector } from "../components/StageHeaderSelector";
import GAPOProgressTracker from "@/components/gapo/GAPOProgressTracker";
import { useCompanies } from "@/hooks/useCompanies";
import { Building2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects"; // Necessary for auto-selection logic
import { useSites } from "@/hooks/useSites";
import { useWorkStages } from "@/hooks/useWorkStages";
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
            <TableCell className="sticky left-[40px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-center p-2 transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
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
            <TableCell className="font-black sticky left-[120px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-center text-primary text-xs transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                <span className="font-mono tracking-tighter text-shadow-glow">{tower.objectId}</span>
            </TableCell>
            <TableCell className="sticky left-[220px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] font-bold text-center text-amber-100/40 tracking-wider font-mono transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                {tower.trecho || "-"}
            </TableCell>
            <TableCell className="sticky left-[300px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-center transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                <Badge variant="outline" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border-amber-900/30 text-amber-600/50">
                    {tower.towerType || "N/A"}
                </Badge>
            </TableCell>
            <TableCell className="sticky left-[400px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] text-center font-bold text-amber-100/20 italic transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                {tower.goForward || "-"}
            </TableCell>
            <TableCell className="sticky left-[500px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] text-center font-bold text-amber-100/20 italic transition-colors shadow-[1px_0_3px_rgba(0,0,0,0.2)] opacity-100">
                {tower.totalConcreto || "-"}
            </TableCell>
            <TableCell className="sticky left-[600px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] text-center font-bold text-amber-100/20 italic transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.3)] opacity-100">
                {tower.pesoArmacao || "-"}
            </TableCell>
            <TableCell className="sticky left-[700px] bg-[#0a0806] group-hover/row:bg-[#1a1612] z-30 border-r border-amber-900/20 text-[10px] text-center font-bold text-primary italic transition-colors shadow-[4px_0_15px_rgba(0,0,0,0.7)] opacity-100">
                {tower.pesoEstrutura || "-"}
            </TableCell>

            {/* SCROLLING CELLS */}
            {categories?.map(cat => (
                <React.Fragment key={cat.id}>
                    {cat.activities.map(act => {
                        const status = tower.activityStatuses.find(s => s.activityId === act.id);
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
                                {status ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-1.5 relative min-h-[52px]">
                                        {status.requiresApproval && (
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
                                            style={{ width: `${status.progressPercent || 0}%` }}
                                        />

                                        <div className={cn(
                                            "w-full px-1.5 py-0.5 rounded text-[11px] font-black uppercase tracking-tight z-10 shadow-sm",
                                            status.status === 'FINISHED' ? 'status-concluido' :
                                                status.status === 'IN_PROGRESS' ? 'status-andamento' : 'status-pendente',
                                            isDelayed && status.status !== 'FINISHED' && "border border-red-500/50 text-red-100" // Highlight text if delayed and not finished
                                        )}>
                                            {status.status === 'FINISHED' ? 'CONCLUÍDO' :
                                                status.status === 'IN_PROGRESS' ? `AND. ${status.progressPercent}%` : 'PENDENTE'}
                                        </div>

                                        {/* Seção Fundiária Separada */}
                                        {status.landStatus && status.landStatus !== 'FREE' && (
                                            <div className={cn(
                                                "w-full px-1 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-tighter z-10 border",
                                                status.landStatus === 'EMBARGO' ? 'bg-red-950/40 text-red-500 border-red-500/50' :
                                                    'bg-orange-950/40 text-orange-500 border-orange-500/50'
                                            )}>
                                                {status.landStatus === 'EMBARGO' ? 'EMBARGO' : 'IMPEDIMENTO'}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5 z-10 mt-0.5">
                                            {status.metadata?.leadName && status.metadata.leadName !== 'none' && (
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
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [editingTower, setEditingTower] = useState<TowerProductionData | null>(null);
    const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
    const [executionModalData, setExecutionModalData] = useState<{
        towerId: string;
        towerName: string;
        activityId: string;
        activityName: string;
        status?: TowerActivityStatus;
        towerType?: string | null;
    } | null>(null);

    // State for Company and Project Selection
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(profile?.companyId || 'all');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    
    // Derived state for queries
    const projectId = selectedProjectId;
    const companyId = selectedCompanyId === 'all' ? undefined : selectedCompanyId;

    const [sortConfig, setSortConfig] = useState<{ key: keyof TowerProductionData; direction: "asc" | "desc" } | null>({ key: "objectSeq", direction: "asc" });

    // Hooks
    const { companies, isLoading: isLoadingCompanies } = useCompanies();
    const { projects, isLoading: isLoadingProjects } = useProjects(); // Fetch all projects to filter locally for auto-selection logic

    // Effect: Initialize Company ID based on profile
    useEffect(() => {
        if (profile?.companyId && selectedCompanyId === 'all') {
            setSelectedCompanyId(profile.companyId);
        }
    }, [profile?.companyId, selectedCompanyId]);

    // Effect: Smart Project Auto-Selection
    useEffect(() => {
        // If "ALL COMPANIES" is selected, auto-select "ALL PROJECTS"
        if (selectedCompanyId === 'all') {
            if (selectedProjectId !== 'all') {
                setSelectedProjectId('all');
            }
            return;
        }

        // Only run auto-selection if we have projects loaded and a company selected
        if (projects.length === 0) return;

        // Filter projects by the selected company
        const availableProjects = projects.filter(p => p.companyId === selectedCompanyId);

        if (availableProjects.length === 0) {
            // No projects available for this company
            if (selectedProjectId !== 'all') setSelectedProjectId('all');
            return;
        }

        // Check if current selected project is still valid
        const isCurrentValid = availableProjects.some(p => p.id === selectedProjectId);
        
        if (!isCurrentValid || selectedProjectId === 'all') {
            // Try to match user's affiliated project
            const userProject = availableProjects.find(p => p.id === profile?.projectId);
            
            if (userProject) {
                setSelectedProjectId(userProject.id);
            } else {
                // Fallback: Select the first available project
                setSelectedProjectId(availableProjects[0].id);
            }
        }
    }, [selectedCompanyId, projects, profile?.projectId, selectedProjectId]);


    // Hooks for Analytics Tabs
    const { sites, isLoading: isLoadingSites } = useSites(projectId !== 'all' ? projectId : undefined);

    // Auto-select first site when project changes, or keep current if still valid
    const [localSiteId, setLocalSiteId] = useState<string>('all');

    useEffect(() => {
        // Se mudarmos de projeto, podemos querer resetar para 'all' 
        // ou validar se o canteiro atual ainda existe
        if (selectedProjectId && selectedProjectId !== 'all') {
            if (localSiteId !== 'all' && !sites.find(s => s.id === localSiteId)) {
                setLocalSiteId('all');
            }
        } else {
            setLocalSiteId('all');
        }
    }, [sites, selectedProjectId, localSiteId]);

    const selectedSiteId = localSiteId;

    const { data: towers, isLoading: loadingTowers } = useQuery({
        queryKey: ["production-towers", projectId, companyId, selectedSiteId],
        queryFn: async () => {
             // Construct query params
             const params = new URLSearchParams();
             if (projectId && projectId !== 'all') params.append('projectId', projectId);
             if (companyId) params.append('companyId', companyId);
             if (selectedSiteId && selectedSiteId !== 'all') params.append('siteId', selectedSiteId);
             
            const response = await orionApi.get(`/production/tower-status?${params.toString()}`);
            return response.data as TowerProductionData[];
        },
        enabled: !!companyId || !!profile?.companyId // Enable if we have a company context
    });

    const { data: productionCategories = [], isLoading: loadingCategories } = useQuery({
        queryKey: ['production-categories'],
        queryFn: async () => {
            const res = await orionApi.get('/production/categories');
            return res.data as ProductionCategory[];
        }
    });

    const { stages, createStage, updateStage, isLoading: isLoadingStages } = useWorkStages(selectedSiteId || 'all', selectedProjectId);
    const { records, isLoading: isLoadingRecords } = useTimeRecords();
    const { users, isLoading: isLoadingUsers } = useUsers();

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await orionApi.delete(`/map_elements?id=${id}`);
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
            for (const id of selectedTowers) {
                await orionApi.delete(`/map_elements?id=${id}`);
                await new Promise(resolve => setTimeout(resolve, 300)); // Throttling (Aumentado para 300ms)
            }
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
             for (const t of towers) {
                await orionApi.delete(`/map_elements?id=${t.id}`);
                await new Promise(resolve => setTimeout(resolve, 150)); // Throttling
             }
            toast.success("Todas as torres foram removidas com sucesso");
            setSelectedTowers([]);
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
         } catch {
             toast.error("Erro ao remover todas as torres");
         } finally {
             setIsBulkDeleting(false);
         }
    };

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
        if (!stages || !productionCategories || stages.length === 0) return;
        setIsBulkDeleting(true); // Reuse loading state
        try {
            const categories = productionCategories;
            
            let matchCount = 0;
            for (const stage of stages) {
                // Find match
                let matchId = '';
                for (const cat of categories) {
                    const match = cat.activities.find(a => a.name.trim().toLowerCase() === stage.name.trim().toLowerCase());
                    if (match) {
                        matchId = match.id;
                        break;
                    }
                }
                
                if (matchId && matchId !== 'none') {
                   // Ensure it's linked AND map enabled
                   const needsUpdate = stage.productionActivityId !== matchId || stage.metadata?.mapEnabled !== true;
                   
                   if (needsUpdate) {
                       matchCount++;
                       await updateStage(stage.id, { 
                           productionActivityId: matchId,
                           metadata: { ...stage.metadata, mapEnabled: true }
                       });
                       await new Promise(resolve => setTimeout(resolve, 150)); // Throttling
                   }
                }
            }

            if (matchCount > 0) {
                 toast.success(`${matchCount} etapas vinculadas automaticamente.`);
            } else {
                 toast.info("Nenhuma nova vinculação encontrada.");
            }
        } catch {
            toast.error("Erro ao realizar vínculo automático.");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Transform WorkStages into the structure expected by the Grid
    const stageColumns = React.useMemo<ProductionCategory[] | undefined>(() => {
        if (!stages || stages.length === 0) return undefined;

        console.log("[stageColumns] Transformando etapas:", stages.length);

        // 1. Identify Parents (Categories) and Children (Activities)
        // Ensure numeric sort for displayOrder
        const parents = stages
            .filter(s => !s.parentId)
            .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
        
        const children = stages.filter(s => s.parentId);

        // 2. Map to grid structure
        return parents.map((p, idx) => {
            const catActivities = children
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

            return {
                id: p.id,
                name: p.name,
                description: p.description || null,
                order: idx,
                activities: catActivities
            };
        }).filter(cat => cat.activities.length > 0);
    }, [stages]);
    



    const requestSort = (key: keyof TowerProductionData) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedTowers = React.useMemo(() => {
        if (!towers) return [];
        const sortableItems = [...towers];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
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

    const filteredTowers = sortedTowers?.filter(tower =>
        tower.objectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tower.trecho?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    const isAppLoading = 
        loadingTowers || 
        loadingCategories ||
        isLoadingCompanies ||
        isLoadingProjects ||
        isLoadingSites ||
        isLoadingStages ||
        isLoadingRecords ||
        isLoadingUsers;

    if (isAppLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm font-bold uppercase tracking-widest text-primary/60">Sincronizando Dados...</p>
                </div>
            </div>
        );
    }

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
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-linear-to-r from-primary via-primary to-primary/40 bg-clip-text text-transparent uppercase italic drop-shadow-sm">
                            GESTÃO DE PRODUÇÃO
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-8 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.6)]" />
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em]">Controle Técnico e Planejamento</p>
                        </div>
                    </div>
                </div>


                <div className="flex items-center gap-4">
                    {/* Company Selector (Visible for Admins/Multi-company users) */}
                    {(['SUPER_ADMIN', 'SUPER_ADMIN_GOD', 'ADMIN'].includes(profile?.role || '') || companies.length > 1) && (
                        <div className="w-[200px]">
                            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                <SelectTrigger className="bg-slate-900/50 border-white/10 h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all hover:bg-slate-800/50 hover:border-primary/30 focus:ring-primary/20">
                                   <div className="flex items-center gap-2 truncate">
                                        <Building2 className="w-3.5 h-3.5 text-primary" />
                                        <SelectValue placeholder="Selecione a Empresa" />
                                   </div>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-white/10 backdrop-blur-xl max-h-[300px]">
                                    <SelectItem value="all">TODAS AS EMPRESAS</SelectItem>
                                    {companies.map(company => (
                                        <SelectItem key={company.id} value={company.id} className="text-[11px] font-bold uppercase tracking-wider">{company.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <ProjectSelector
                        value={selectedProjectId}
                        onValueChange={setSelectedProjectId}
                        className="w-[200px]"
                        companyId={selectedCompanyId} // Pass companyId for filtering
                    />

                    {/* Site Selector Hidden - Using Project Level Only */}

                    <div className="h-8 w-px bg-white/10 mx-1" />

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
                                <LayoutGrid className="w-4 h-4" /> Grelha de Produção
                            </TabsTrigger>
                            <TabsTrigger value="progress" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <Activity className="w-4 h-4" /> Avanço Físico
                            </TabsTrigger>
                            <TabsTrigger value="performance" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <BarChart3 className="w-4 h-4" /> Performance (KPIs)
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                            {activeTab === 'grid' && (
                                <div className="relative w-full sm:w-80 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        placeholder="Localizar torre ou trecho..."
                                        className="pl-9 bg-black/40 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 h-9 text-xs transition-all rounded-lg text-foreground placeholder:text-muted-foreground/30 font-medium"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
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
                                                <DropdownMenuItem onClick={() => setIsStageModalOpen(true)} className="cursor-pointer">
                                                    <Plus className="mr-2 h-4 w-4" /> Criar/Editar Etapas
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-800" />
                                                <DropdownMenuLabel>Mapa Visual (Vínculos)</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={handleBulkAutoLink} className="cursor-pointer">
                                                    <Activity className="mr-2 h-4 w-4 text-green-500" /> 
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
                                            onClick={() => setIsImportModalOpen(true)}
                                        >
                                            <Upload className="h-3.5 w-3.5 text-primary" />
                                            Importar
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
                                <ProjectEmptyState
                                    type="towers"
                                    title="Nenhuma Torre Cadastrada"
                                    description="Esta obra ainda não possui torres ou atividades técnicas. Você pode importar uma planilha Excel ou cadastrar manualmente."
                                    onAction={() => setIsTowerModalOpen(true)}
                                    onSecondaryAction={() => setIsImportModalOpen(true)}
                                    actionLabel="Nova Torre"
                                    secondaryActionLabel="Importar Excel"
                                />
                            </div>
                        ) : (
                            <>
                                {/* KPI Dashboard Section - Collapsible or Always Visible? */}


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
                                                <TableHead className="w-[70px] h-14 sticky left-0 top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 text-center font-black uppercase text-[10px] tracking-widest text-foreground p-0">
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
                                                        "w-[100px] h-14 sticky left-[120px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
                                                        sortConfig?.key === 'objectId' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('objectId')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">ID OBRA</span>
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
                                                        "w-[120px] h-14 sticky left-[220px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
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
                                                        "w-[100px] h-14 sticky left-[340px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
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
                                                        "w-[100px] h-14 sticky left-[440px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
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
                                                        "w-[100px] h-14 sticky left-[540px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
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
                                                        "w-[100px] h-14 sticky left-[640px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[2px_0_8px_rgba(0,0,0,0.5)] opacity-100",
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
                                                        "w-[100px] h-14 sticky left-[740px] top-0 bg-[#0a0806] z-50 border-r border-amber-900/20 cursor-pointer hover:bg-[#1a1612] transition-colors group text-center shadow-[4px_0_15px_rgba(0,0,0,0.7)] opacity-100",
                                                        sortConfig?.key === 'pesoEstrutura' && "text-primary"
                                                    )}
                                                    onClick={() => requestSort('pesoEstrutura')}
                                                >
                                                    <div className="flex items-center justify-center gap-1 h-full">
                                                        <span className="font-black uppercase text-[10px] tracking-widest group-hover:text-primary transition-colors">TORRE (T)</span>
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
                                                        {cat.activities.map(act => (
                                                            <TableHead key={act.id} className="min-w-[160px] h-14 bg-[#0a0806] z-40 sticky top-0 text-center border-r border-amber-900/10 font-black text-[10px] uppercase tracking-widest text-[#d4af37]/80 group hover:bg-[#1a1612] transition-colors opacity-100 p-0">
                                                                <div className="w-full h-full flex flex-col justify-center">
                                                                    <div className="w-full text-center py-1 bg-[#1a1612]/50 border-b border-white/5">
                                                                        <span className="text-amber-600/40 text-[8px] font-bold tracking-[0.2em] leading-none">{cat.name.toUpperCase()}</span>
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
                                                                            createdAt: new Date(),
                                                                            // This is the CRITICAL part: we need to pass the productionActivityId if it exists
                                                                            productionActivityId: act.productionActivityId, // Assuming logic below adds this
                                                                            metadata: act.metadata
                                                                        }}
                                                                        onUpdate={async (stageId, payload) => {
                                                                            // Payload can be { productionActivityId } or { metadata } or both
                                                                            await updateStage(stageId, payload);
                                                                            // Invalidate queries to refresh columns
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
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="progress" className="h-full overflow-auto p-6">
                        {(!towers || towers.length === 0) ? (
                            <div className="flex-1 flex items-center justify-center h-[60vh]">
                                <ProjectEmptyState
                                    type="towers"
                                    title="Sem Torres para Acompanhar"
                                    description="Para visualizar o progresso físico, é necessário primeiro cadastrar as torres da obra."
                                    onAction={() => setIsTowerModalOpen(true)}
                                    actionLabel="Nova Torre"
                                />
                            </div>
                        ) : (!sites || sites.length === 0) ? (
                            <div className="flex-1 flex items-center justify-center h-[60vh]">
                                <ProjectEmptyState
                                    type="sites"
                                    title="Nenhum Canteiro Encontrado"
                                    description="Para acompanhar o avanço físico, você precisa primeiro cadastrar os canteiros e trechos desta obra."
                                    onAction={() => navigate('/canteiros')}
                                    actionLabel="Configurar Canteiros"
                                />
                            </div>
                        ) : (!stages || stages.length === 0) ? (
                            <div className="flex-1 flex items-center justify-center h-[60vh]">
                                <ProjectEmptyState
                                    type="generic"
                                    title="Etapas Não Configuradas"
                                    description="Não foram encontradas etapas de trabalho (Atividades) para este canteiro. Verifique as configurações de cronograma."
                                    onAction={() => setIsStageModalOpen(true)}
                                    actionLabel="Configurar Etapas"
                                />
                            </div>
                        ) : (
                            <GAPOProgressTracker siteId={selectedSiteId} projectId={selectedProjectId} />
                        )}
                    </TabsContent>

                    <TabsContent value="performance" className="h-full overflow-auto p-6">
                        {(!towers || towers.length === 0) ? (
                            <div className="flex-1 flex items-center justify-center h-[60vh]">
                                <ProjectEmptyState
                                    type="towers"
                                    title="Sem Dados de Performance"
                                    description="A análise de performance requer que existam torres e atividades cadastradas na obra."
                                    onAction={() => setIsTowerModalOpen(true)}
                                    actionLabel="Nova Torre"
                                />
                            </div>
                        ) : (!users || users.length === 0) ? (
                            <div className="flex-1 flex items-center justify-center h-[60vh]">
                                <ProjectEmptyState
                                    type="workers"
                                    title="Nenhum Funcionário Alocado"
                                    description="Não há dados de performance pois ainda não foram cadastrados funcionários ou equipes para esta obra."
                                    onAction={() => navigate('/usuarios')}
                                    actionLabel="Cadastrar Equipe"
                                />
                            </div>
                        ) : (
                            <GAPOAnalyticsPanel stages={stages} records={records} projectId={selectedProjectId !== 'all' ? selectedProjectId : undefined} />
                        )}
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

            <ExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                projectId={projectId!}
            />

            <StageFormModal
                isOpen={isStageModalOpen}
                onClose={() => setIsStageModalOpen(false)}
                onSave={createStage}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['work-stages'] })}
            />

        </div >
    );
};

export default ProductionPage;
