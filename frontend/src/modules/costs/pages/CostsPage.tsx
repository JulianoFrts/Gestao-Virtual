import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { orionApi } from "@/integrations/orion/client";
import { kpiService } from "@/services/kpiService";
import { TowerProductionData } from "@/modules/production/types";
import ProductionCostDashboard from "@/modules/production/components/ProductionCostDashboard";
import CostConfigurationModal from "@/modules/production/components/CostConfigurationModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coins, Settings2, Filter, DollarSign, Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { ProjectEmptyState } from "@/components/shared/ProjectEmptyState";
import DelayCostModal from "@/modules/production/components/DelayCostModal";
import { selectedContextSignal } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";

export default function CostsPage() {
    useSignals();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const { projects } = useProjects();
    const isGod = (profile?.role as string) === 'SUPER_ADMIN' || (profile?.role as string) === 'SUPER_ADMIN_GOD' || (profile?.role as string) === 'ADMIN' || !!profile?.isSystemAdmin;
    
    // Context from Global Signal
    const selectedContext = selectedContextSignal.value;
    const projectId = selectedContext?.projectId || 'all';

    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);

    // Fetch Data
    const { data: towers, isLoading: loadingTowers } = useQuery({
        queryKey: ["production-towers", projectId, profile?.companyId],
        queryFn: async () => {
            const companyIdParam = isGod ? 'all' : profile?.companyId;
            const response = await orionApi.get(`/production/tower-status?projectId=${projectId}&companyId=${companyIdParam}`);
            return response.data as TowerProductionData[];
        },
        enabled: !!profile?.companyId
    });

    const { data: categories } = useQuery({
        queryKey: ["production-categories"],
        queryFn: async () => {
            const response = await orionApi.get("/production/categories");
            return response.data as any[];
        }
    });

    const { data: unitCosts } = useQuery({
        queryKey: ["unit-costs", projectId],
        queryFn: () => kpiService.getUnitCosts(projectId),
        enabled: !!projectId && projectId !== 'all'
    });

    const currentProjectName = projects.find(p => p.id === projectId)?.name || "Todas as Obras";

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-background/95 backdrop-blur-xl z-50 shadow-2xl relative">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter bg-linear-to-r from-amber-500 via-yellow-500 to-amber-700 bg-clip-text text-transparent uppercase italic drop-shadow-sm flex items-center gap-2">
                            <Coins className="h-6 w-6 text-amber-500" />
                            GESTÃO DE CUSTOSsss
                        </h1>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em] pl-1">
                            Financeiro de Produ222ção11111 - {currentProjectName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 uppercase text-[10px] font-bold tracking-wider"
                        onClick={() => setIsDelayModalOpen(true)}
                        disabled={projectId === 'all'}
                    >
                        <DollarSign className="h-3.5 w-3.5 mr-2" />
                        Multas
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 uppercase text-[10px] font-bold tracking-wider"
                        onClick={() => setIsConfigOpen(true)}
                        disabled={projectId === 'all'}
                    >
                        <Settings2 className="h-3.5 w-3.5 mr-2" />
                        Configurar Custos
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6 bg-black/20">
                <div className="max-w-7xl mx-auto space-y-6">
                    {loadingTowers ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
                            <p className="text-white animate-pulse font-bold">Calculando financeiro...</p>
                        </div>
                    ) : (!towers || towers.length === 0) ? (
                        <div className="flex items-center justify-center min-h-[500px]">
                            <ProjectEmptyState
                                type="towers"
                                title="Sem Dados Financeiros"
                                description="Para visualizar a gestão de custos, é necessário que a obra possua torres e atividades cadastradas com seus respectivos pesos (Concreto, Aço, Estrutura)."
                                onAction={() => navigate('/producao')}
                                actionLabel="Ir para Produção"
                            />
                        </div>
                    ) : (
                        <ProductionCostDashboard
                            projectId={projectId}
                            towers={towers || []}
                            categories={categories || []}
                            unitCosts={unitCosts || []}
                        />
                    )}
                </div>
            </main>

            {projectId !== 'all' && (
                <>
                    <CostConfigurationModal
                        isOpen={isConfigOpen}
                        onClose={() => setIsConfigOpen(false)}
                        projectId={projectId}
                    />
                    <DelayCostModal
                        isOpen={isDelayModalOpen}
                        onClose={() => setIsDelayModalOpen(false)}
                        projectId={projectId}
                    />
                </>
            )}
        </div>
    );
}
