import React from 'react';
import { Scene } from '../components/Scene';
import { CompletedWorkModal } from '../components/CompletedWorkModal';
import { useCompanies } from '@/hooks/useCompanies';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Building2, Briefcase, ChevronRight } from "lucide-react";
import { cn } from '@/lib/utils';
import { ExcelDataUploader } from '@/components/map/ExcelDataUploader';
import { toast } from 'sonner';
import { orionApi } from '@/integrations/orion/client';

export const GeoViewerPage = () => {
    const { profile } = useAuth();
    const [isOffline, setIsOffline] = React.useState(false);

    // Filters State
    const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(profile?.companyId || null);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);

    const { companies } = useCompanies();
    const { projects } = useProjects(selectedCompanyId || undefined);

    // Auto-select first project when company changes
    React.useEffect(() => {
        if (selectedCompanyId) {
            const companyProjects = projects.filter(p => p.companyId === selectedCompanyId);
            if (companyProjects.length > 0 && !selectedProjectId) {
                setSelectedProjectId(companyProjects[0].id);
            }
        }
    }, [selectedCompanyId, projects, selectedProjectId]);

    return (
        <div className="w-screen h-screen relative bg-[#0a0a0a] overflow-hidden">
            {/* 3D Scene Container */}
            <div className="absolute inset-0 z-0">
                <Scene offline={isOffline} />
            </div>

            {/* TOP BAR UI - Professional Multi-Project Switcher */}
            <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
                {/* Logo Area */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-4 h-11 rounded-2xl shadow-2xl">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/90">
                        Orion <span className="text-primary">Viewer</span>
                    </span>
                </div>

                <div className="h-6 w-px bg-white/10 mx-1" />

                {/* Company Select */}
                <div className="flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl pl-4 pr-1 h-11 hover:border-white/20 transition-all shadow-xl group">
                    <Building2 className="w-4 h-4 text-white/40 group-hover:text-primary/60 transition-colors" />
                    <Select value={selectedCompanyId || ""} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-[180px] bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-white/80 focus:ring-0">
                            <SelectValue placeholder="Selecione Empresa" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {companies.map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-[11px] uppercase font-bold tracking-widest">
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <ChevronRight className="w-4 h-4 text-white/20" />

                {/* Project Select */}
                <div className={cn(
                    "flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl pl-4 pr-1 h-11 transition-all shadow-xl group",
                    !selectedCompanyId && "opacity-40 grayscale pointer-events-none"
                )}>
                    <Briefcase className="w-4 h-4 text-white/40 group-hover:text-primary/60 transition-colors" />
                    <Select value={selectedProjectId || ""} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-[200px] bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-white/80 focus:ring-0">
                            <SelectValue placeholder="Selecione Obra" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-[11px] uppercase font-bold tracking-widest">
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
                <ExcelDataUploader onLoad={async (towers, _conns) => {
                    if (!selectedProjectId) {
                        toast.error("Selecione um projeto primeiro");
                        return;
                    }
                    try {
                        const towersToUpdate = towers.map((t, index) => ({
                            projectId: selectedProjectId,
                            externalId: t.name,
                            name: t.name,
                            elementType: "TOWER",
                            latitude: t.coordinates.lat,
                            longitude: t.coordinates.lng,
                            elevation: t.coordinates.altitude,
                            sequence: index,
                            metadata: t.properties || {},
                        }));

                        const { error } = await orionApi.from("tower_technical_data").insert(towersToUpdate);
                        if (error) throw error;
                        
                        toast.success("Projeto Importado com Sucesso");
                        window.location.reload(); // Refresh to show new towers in Scene
                    } catch (err) {
                        console.error(err);
                        toast.error("Erro ao importar projeto");
                    }
                }} />
                <CompletedWorkModal 
                    companyId={selectedCompanyId}
                    projectId={selectedProjectId}
                    onCompanyChange={setSelectedCompanyId}
                    onProjectChange={setSelectedProjectId}
                />
                
                {/* Offline Toggle Badge */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full self-end">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isOffline ? "bg-red-500" : "bg-green-500")} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                        {isOffline ? 'Offline' : 'Live Mode'}
                    </span>
                    <input
                        type="checkbox"
                        checked={isOffline}
                        onChange={(e) => setIsOffline(e.target.checked)}
                        className="opacity-0 absolute inset-0 cursor-pointer"
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-4 left-4 z-10 text-white/40 text-xs">
                <p>Modules / Geo Viewer / v1.0.0</p>
            </div>
        </div>
    );
};

export default GeoViewerPage;
