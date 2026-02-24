import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { orionApi } from "@/integrations/orion/client";
import { kpiService } from "@/services/kpiService";
import { TowerProductionData, TowerActivityStatus, ProductionCategory } from "../types";
import ProductionDashboard from "../components/ProductionDashboard";
import ProductionCostDashboard from "../components/ProductionCostDashboard";
import SixWeekLookAhead from "../components/SixWeekLookAhead";
import LaborAnalyticsDashboard from "../components/LaborAnalyticsDashboard";
import TeamAnalyticsDashboard from "../components/TeamAnalyticsDashboard";
import CostConfigurationModal from "../components/CostConfigurationModal";
import ActivityStatusModal from "../components/ActivityStatusModal";
import QuickScheduleModal from "../components/QuickScheduleModal";
import BulkScheduleModal from "../components/BulkScheduleModal";
import TowerFormModal from "../components/TowerFormModal";
import ExcelImportModal from "../components/ExcelImportModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Coins, CalendarClock, Settings2, Layers, Plus, Upload, TrendingUp, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/hooks/useProjects";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { CompanySelector } from "@/components/shared/CompanySelector";
import { selectedContextSignal } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";
import { ProjectEmptyState } from "@/components/shared/ProjectEmptyState";
import { useUsers } from "@/hooks/useUsers";
import { Loader2, HardHat } from "lucide-react";
import { useSites } from "@/hooks/useSites";
import { Card } from "@/components/ui/card";

const ProductionAnalyticsPage = () => {
    useSignals();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const { projects } = useProjects();
    
    // Context from Global Signal
    const selectedContext = selectedContextSignal.value;
    const selectedProjectId = selectedContext?.projectId || 'all';
    const selectedCompanyId = selectedContext?.companyId || 'all';
    const selectedSiteId = selectedContext?.siteId === 'all' ? '' : (selectedContext?.siteId || '');

    // Hooks for Site Selection (Matching ProductionPage)
    const { sites } = useSites(selectedProjectId !== 'all' ? selectedProjectId : undefined);

    // Simplified site management
    const projectId = selectedProjectId;
    const companyId = selectedCompanyId;
    const [activeTab, setActiveTab] = useState("overview");
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isTowerModalOpen, setIsTowerModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [timeRange, setTimeRange] = useState("month");
    
    const [selectedCell, setSelectedCell] = useState<{
        towerId: string;
        towerName: string;
        towerType: string | null;
        activityId: string;
        activityName: string;
        status?: TowerActivityStatus;
    } | null>(null);

    const [selectedScheduleCell, setSelectedScheduleCell] = useState<{
        towerId: string;
        towerName: string;
        activityId: string;
        activityName: string;
        plannedStart?: string;
        plannedEnd?: string;
    } | null>(null);

    const [selectedBulkWeek, setSelectedBulkWeek] = useState<Date | null>(null);
    const isGod = (profile?.role as string) === 'SUPER_ADMIN' || (profile?.role as string) === 'SUPER_ADMIN_GOD' || (profile?.role as string) === 'ADMIN' || !!profile?.isSystemAdmin;

    const { users } = useUsers();

    // --- Queries ---

    const { data: towers, isLoading: loadingTowers } = useQuery({
        queryKey: ["production-towers", projectId, companyId, selectedSiteId],
        queryFn: async () => {
            const companyIdParam = isGod ? (companyId === 'all' ? 'all' : companyId) : profile?.companyId;
            const siteIdParam = selectedSiteId === 'all' ? '' : selectedSiteId;
            
            const response = await orionApi.get(`/production/tower-status?projectId=${projectId}&companyId=${companyIdParam}&siteId=${siteIdParam}`);
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
        enabled: !!profile?.companyId || isGod,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchOnMount: true
    });

    const { data: categories } = useQuery({
        queryKey: ["production-categories"],
        queryFn: async () => {
            const response = await orionApi.get("/production/categories");
            return response.data as ProductionCategory[];
        }
    });

    // Fetched specifically for the Financial Tab, but available globally now
    const { data: unitCosts } = useQuery({
        queryKey: ["unit-costs", projectId],
        queryFn: () => kpiService.getUnitCosts(projectId),
        enabled: !!projectId && projectId !== 'all'
    });

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-background/95 backdrop-blur-xl z-50 shadow-2xl relative">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/producao')}
                        className="rounded-full hover:bg-primary/10 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter bg-linear-to-r from-primary via-primary to-primary/40 bg-clip-text text-transparent uppercase italic drop-shadow-sm flex items-center gap-2">
                            <Layers className="h-6 w-6 text-primary" />
                            GESTÃO DE PRODUÇÃO
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-8 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.6)]" />
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em]">Analytics e Custos</p>
                        </div>
                    </div>
                </div>

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

                    <div className="h-8 w-px bg-white/10 mx-1" />

                    <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:bg-primary/10 text-foreground font-bold h-9 px-4 rounded-lg uppercase text-[10px] tracking-wider"
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        <Upload className="h-3.5 w-3.5 mr-2 text-primary" />
                        Importar
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 gradient-primary border-none text-primary-foreground font-black uppercase tracking-wider h-9 px-4 rounded-lg text-[10px]"
                        onClick={() => setIsTowerModalOpen(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Nova Torre
                    </Button>

                    <div className="h-8 w-px bg-white/10 mx-1" />

                    {/* Show Config Button only if on Financial Tab or generally available? */}
                    {activeTab === 'financial' && projectId !== 'all' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 uppercase text-[10px] font-bold tracking-wider animate-in fade-in zoom-in duration-300"
                            onClick={() => setIsConfigOpen(true)}
                        >
                            <Settings2 className="h-3.5 w-3.5 mr-2" />
                            Configurar Custos
                        </Button>
                    )}

                    <div className="flex items-center gap-2">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="bg-slate-900/50 border-white/10 h-9 text-[10px] font-bold uppercase tracking-wider w-[140px] rounded-xl hover:bg-slate-800/50 transition-all focus:ring-primary/20">
                                <CalendarClock className="w-3.5 h-3.5 mr-2 text-primary" />
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-white/10">
                                <SelectItem value="week">Semana</SelectItem>
                                <SelectItem value="month">Mês</SelectItem>
                                <SelectItem value="quarter">Trimestre</SelectItem>
                                <SelectItem value="year">Ano</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6 bg-black/20">
                <div className="max-w-7xl mx-auto space-y-6">

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                        <div className="flex items-center justify-center">
                            <TabsList className="bg-slate-950/60 border border-white/10 p-1 h-12 w-full max-w-3xl shadow-2xl shadow-black/50 overflow-x-auto rounded-2xl">
                                <TabsTrigger
                                    value="overview"
                                    className="flex-1 text-[10px] uppercase font-black tracking-[0.2em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 rounded-xl"
                                >
                                    <BarChart3 className="w-3.5 h-3.5 mr-2" />
                                    Painel HH
                                </TabsTrigger>
                                <TabsTrigger
                                    value="physics"
                                    className="flex-1 text-[10px] uppercase font-black tracking-[0.2em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 rounded-xl"
                                >
                                    <TrendingUp className="w-3.5 h-3.5 mr-2" />
                                    Físico (Curva S)
                                </TabsTrigger>
                                <TabsTrigger
                                    value="schedule"
                                    className="flex-1 text-[10px] uppercase font-black tracking-[0.2em] data-[state=active]:bg-emerald-500 data-[state=active]:text-black transition-all duration-300 rounded-xl"
                                >
                                    <CalendarClock className="w-3.5 h-3.5 mr-2" />
                                    Programação
                                </TabsTrigger>
                                <TabsTrigger
                                    value="financial"
                                    className="flex-1 text-[10px] uppercase font-black tracking-[0.2em] data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all duration-300 rounded-xl"
                                >
                                    <Coins className="w-3.5 h-3.5 mr-2" />
                                    Financeiro
                                </TabsTrigger>
                                <TabsTrigger
                                    value="teams"
                                    className="flex-1 text-[10px] uppercase font-black tracking-[0.2em] data-[state=active]:bg-purple-500 data-[state=active]:text-black transition-all duration-300 rounded-xl"
                                >
                                    <Users className="w-3.5 h-3.5 mr-2" />
                                    Análise Equipe
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {loadingTowers ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                <p className="text-white animate-pulse font-bold">Consolidando dados...</p>
                            </div>
                        ) : !towers || towers.length === 0 ? (
                            <div className="flex items-center justify-center min-h-[500px]">
                                <ProjectEmptyState
                                    type="towers"
                                    title="Nenhuma Torre para Analisar"
                                    description="Não há dados de produção disponíveis para esta obra. Comece cadastrando as torres e subtrechos na tela de planejamento."
                                    onAction={() => navigate('/producao')}
                                    actionLabel="Ir para Planejamento"
                                />
                            </div>
                        ) : (
                            <>
                                <TabsContent value="overview" className="animate-in slide-in-from-left-4 fade-in duration-500 focus-visible:outline-none">
                                    <LaborAnalyticsDashboard
                                        projectId={projectId}
                                        projects={projects}
                                        timeRange={timeRange}
                                    />
                                </TabsContent>

                                <TabsContent value="physics" className="animate-in slide-in-from-left-4 fade-in duration-500 focus-visible:outline-none">
                                    <ProductionDashboard
                                        projectId={projectId}
                                        towers={towers || []}
                                        categories={categories || []}
                                    />
                                </TabsContent>

                                <TabsContent value="financial" className="animate-in slide-in-from-right-4 fade-in duration-500 focus-visible:outline-none">
                                    <ProductionCostDashboard
                                        projectId={projectId}
                                        towers={towers || []}
                                        categories={categories || []}
                                        unitCosts={unitCosts || []}
                                    />
                                </TabsContent>

                                <TabsContent value="schedule" className="animate-in zoom-in-95 fade-in duration-500 focus-visible:outline-none">
                                    <SixWeekLookAhead
                                        towers={towers || []}
                                        categories={categories || []}
                                        projectId={projectId}
                                        companyId={profile?.companyId}
                                        onEditActivity={(towerId, activityId, plannedStart, plannedEnd) => {
                                            const tower = towers?.find(t => t.id === towerId);
                                            const activity = categories?.flatMap(c => c.activities).find(a => a.id === activityId);

                                            if ((tower || !towerId) && activity) {
                                                setSelectedScheduleCell({
                                                    towerId: tower ? tower.id : "",
                                                    towerName: tower ? tower.objectId : "",
                                                    activityId: activity.id,
                                                    activityName: activity.name,
                                                    plannedStart,
                                                    plannedEnd
                                                });
                                            }
                                        }}
                                        onWeekClick={(startDate) => setSelectedBulkWeek(startDate)}
                                    />
                                </TabsContent>

                                <TabsContent value="teams" className="animate-in slide-in-from-right-4 fade-in duration-500 focus-visible:outline-none">
                                    {(!towers || towers.length === 0) ? (
                                        <div className="flex items-center justify-center min-h-[400px]">
                                            <ProjectEmptyState
                                                type="towers"
                                                title="Sem Dados de Equipe"
                                                description="A análise de equipe requer que existam torres e atividades cadastradas para correlacionar o desempenho."
                                                onAction={() => navigate('/producao')}
                                                actionLabel="Ir para Produção"
                                            />
                                        </div>
                                    ) : (!users || users.length === 0) ? (
                                        <div className="flex items-center justify-center min-h-[400px]">
                                            <ProjectEmptyState
                                                type="workers"
                                                title="Equipes Não Configuradas"
                                                description="Para visualizar a análise de equipe, é necessário alocar funcionários e frentes de trabalho para esta obra."
                                                onAction={() => navigate('/usuarios')}
                                                actionLabel="Gerenciar Equipes"
                                            />
                                        </div>
                                    ) : (
                                        <TeamAnalyticsDashboard
                                            projectId={projectId}
                                        />
                                    )}
                                </TabsContent>
                            </>
                        )}
                    </Tabs>

                </div>
            </main >

            {/* Modals */}
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

            {
                selectedScheduleCell && (
                    <QuickScheduleModal
                        isOpen={!!selectedScheduleCell}
                        onClose={() => setSelectedScheduleCell(null)}
                        towerId={selectedScheduleCell.towerId}
                        towerName={selectedScheduleCell.towerName}
                        activityId={selectedScheduleCell.activityId}
                        activityName={selectedScheduleCell.activityName}
                        projectId={projectId}
                        initialPlannedStart={selectedScheduleCell.plannedStart}
                        initialPlannedEnd={selectedScheduleCell.plannedEnd}
                        availableTowers={towers || []}
                    />
                )
            }

            <TowerFormModal
                isOpen={isTowerModalOpen}
                onClose={() => setIsTowerModalOpen(false)}
                projectId={projectId!}
                tower={null}
            />

            <ExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                projectId={projectId!}
            />

            {
                selectedBulkWeek && (
                    <BulkScheduleModal
                        isOpen={!!selectedBulkWeek}
                        onClose={() => setSelectedBulkWeek(null)}
                        towers={towers || []}
                        categories={categories || []}
                        defaultStartDate={selectedBulkWeek}
                        projectId={projectId}
                    />
                )
            }

            {
                projectId !== 'all' && (
                    <CostConfigurationModal
                        isOpen={isConfigOpen}
                        onClose={() => setIsConfigOpen(false)}
                        projectId={projectId}
                    />
                )
            }
        </div >
    );
};

export default ProductionAnalyticsPage;
