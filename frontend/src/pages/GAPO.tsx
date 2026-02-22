import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    LayoutDashboard,
    History,
    FileText,
    ShieldCheck,
    TrendingUp,
    Download,
    FileSpreadsheet,
    Printer,
    Filter as FilterIcon,
    HardHat,
    AlertCircle,
} from 'lucide-react';
import { selectedContextSignal } from '@/signals/authSignals';
import { useSignals } from "@preact/signals-react/runtime";
import { ProjectEmptyState } from '@/components/shared/ProjectEmptyState';
import { ProjectSelector } from '@/components/shared/ProjectSelector';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Hooks
import { useWorkStages } from '@/hooks/useWorkStages';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { useSites } from '@/hooks/useSites';
import { useAuditStats } from '@/hooks/useAuditStats';

// Specialized GAPO Components
import GAPOAuditDashboard from '@/components/gapo/GAPOAuditDashboard';
import GAPODocumentHub from '@/components/gapo/GAPODocumentHub';
import GAPOAnalyticsPanel from '@/components/gapo/GAPOAnalyticsPanel';
import GAPODeviationReport from '@/components/gapo/GAPODeviationReport';
import GAPOExecutiveOverview from '@/components/gapo/GAPOExecutiveOverview';

export default function GAPO() {
    useSignals();
    
    // Context from Global Signal
    const selectedContext = selectedContextSignal.value;
    const selectedProjectId = selectedContext?.projectId || null;
    const selectedSiteId = selectedContext?.siteId || 'all';

    const { sites } = useSites(selectedProjectId || undefined);

    const { toast } = useToast();

    // Stats hooks
    const { stages } = useWorkStages(selectedSiteId || 'all', selectedProjectId);
    const { records } = useTimeRecords();
    const { pendingCount } = useAuditStats();

    const handleExport = (type: string) => {
        toast({
            title: `Exportação ${type}`,
            description: `A exportação do relatório em ${type} está sendo processada e será baixada em instantes.`,
        });
    };

    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black font-display tracking-tight text-foreground uppercase">
                                Módulo GAPO
                            </h1>
                            <p className="text-muted-foreground text-xs font-medium italic">
                                Gestão, Auditoria e Performance de Obras
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="glass-card gap-2 text-[10px] font-black uppercase tracking-widest border-white/5 h-9"
                        onClick={() => handleExport('PDF')}
                    >
                        <Printer className="w-3.5 h-3.5 text-primary" /> PDF
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="glass-card gap-2 text-[10px] font-black uppercase tracking-widest border-white/5 h-9"
                        onClick={() => handleExport('EXCEL')}
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="glass-card gap-2 text-[10px] font-black uppercase tracking-widest border-white/5 h-9"
                    >
                        <FilterIcon className="w-3.5 h-3.5 text-blue-500" /> Filtros
                    </Button>
                    <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />
                    <Button
                        size="sm"
                        className="gradient-primary gap-2 text-[10px] font-black uppercase tracking-widest h-9"
                    >
                        <Download className="w-3.5 h-3.5" /> Exportar Tudo
                    </Button>
                </div>
            </header>

            {!selectedProjectId ? (
                <div className="flex-1 flex items-center justify-center min-h-[500px]">
                    <ProjectEmptyState
                        type="generic"
                        title="GAPO: Selecione uma Obra"
                        description="Selecione um projeto acima para visualizar os dados de auditoria e performance."
                    />
                </div>
            ) : (
                <Tabs defaultValue="dashboard" className="w-full">
                    <TabsList className="glass-card mb-8 p-1 flex justify-start overflow-x-auto gap-2 border-white/5">
                        <TabsTrigger value="dashboard" className="gap-2 px-6 py-2">
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="gap-2 px-6 py-2">
                            <History className="w-4 h-4" /> Auditoria Operacional
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="gap-2 px-6 py-2">
                            <FileText className="w-4 h-4" /> Documentação
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="gap-2 px-6 py-2">
                            <TrendingUp className="w-4 h-4" /> Performance
                        </TabsTrigger>
                        <TabsTrigger value="deviation" className="gap-2 px-6 py-2">
                            <AlertCircle className="w-4 h-4" /> Desvio
                        </TabsTrigger>

                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-6">
                        <GAPOExecutiveOverview 
                            projectId={selectedProjectId || undefined}
                            stages={stages}
                            records={records}
                            pendingAudits={pendingCount}
                        />
                    </TabsContent>

                    <TabsContent value="audit">
                        <GAPOAuditDashboard projectId={selectedProjectId || undefined} siteId={selectedSiteId || undefined} />
                    </TabsContent>

                    <TabsContent value="documents">
                        <GAPODocumentHub projectId={selectedProjectId} siteId={selectedSiteId} />
                    </TabsContent>

                    <TabsContent value="performance">
                        <GAPOAnalyticsPanel 
                            projectId={selectedProjectId || undefined} 
                            stages={stages} 
                            records={records} 
                        />
                    </TabsContent>

                    <TabsContent value="deviation">
                        <GAPODeviationReport 
                            stages={stages} 
                            projectId={selectedProjectId || undefined} 
                        />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
