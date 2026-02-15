import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { Filter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
    showAll?: boolean;
    placeholder?: string;
    companyId?: string;
}

export const ProjectSelector = React.memo(function ProjectSelector({
    value,
    onValueChange,
    className,
    showAll = true,
    placeholder = "Selecione a Obra",
    companyId
}: ProjectSelectorProps) {
    const { profile } = useAuth();
    const { projects, isLoading } = useProjects();

    // Access Control: Filter by company unless SUPER_ADMIN, ADMIN or TI
    const isAdmin = profile?.role && ['SUPER_ADMIN', 'SUPER_ADMIN_GOD', 'ADMIN', 'TI_SOFTWARE'].includes(profile.role);

    const filteredProjects = React.useMemo(() => {
        // Se um companyId específico for passado, filtrar estritamente por ele
        if (companyId && companyId !== 'all') {
            return projects.filter(p => p.companyId === companyId);
        }
        
        // Comportamento padrão baseado em permissões
        if (isAdmin) return projects;
        if (!profile?.companyId) return [];
        return projects.filter(p => p.companyId === profile.companyId);
    }, [projects, profile?.companyId, isAdmin, companyId]);

    // Otimização: Se não houver projetos, não renderizaSelect pesado se não estiver carregando
    if (!isLoading && filteredProjects.length === 0 && !showAll) return null;

    return (
        <div className={cn("relative", className)}>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger className="bg-slate-900/50 border-white/10 h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all hover:bg-slate-800/50 hover:border-primary/30 focus:ring-primary/20">
                    <div className="flex items-center gap-2 truncate">
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                            <Filter className="w-3.5 h-3.5 text-primary" />
                        )}
                        <SelectValue placeholder={placeholder} />
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 backdrop-blur-xl max-h-[300px]">
                    {showAll && (
                        <SelectItem
                            value="all"
                            className="text-[11px] font-bold uppercase tracking-wider focus:bg-primary focus:text-primary-foreground"
                        >
                            Todas as Obras
                        </SelectItem>
                    )}
                    {filteredProjects.map((project) => (
                        <SelectItem
                            key={project.id}
                            value={project.id}
                            className="text-[11px] font-bold uppercase tracking-wider focus:bg-primary focus:text-primary-foreground"
                        >
                            {project.name}
                        </SelectItem>
                    ))}
                    {!isLoading && filteredProjects.length === 0 && (
                        <div className="px-2 py-4 text-center text-[10px] text-muted-foreground uppercase font-bold italic">
                            Nenhuma obra encontrada
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
});
