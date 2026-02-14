import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { orionApi } from "@/integrations/orion/client";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SiteSelectorProps {
    projectId: string; // Creates dependency on Project
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    showAll?: boolean;
}

export const SiteSelector = React.memo(function SiteSelector({
    projectId,
    value,
    onValueChange,
    className,
    placeholder = "Selecione o Canteiro/Trecho",
    showAll = true
}: SiteSelectorProps) {
    
    const { data: sites = [], isLoading } = useQuery({
        queryKey: ['sites-list', projectId],
        queryFn: async () => {
            if (!projectId || projectId === 'all') return [];
            const res = await orionApi.get(`/sites?projectId=${projectId}`);
            // The API might wrap in { data: ... } or return array directly, let's normalize
            const raw = res.data;
            if (Array.isArray(raw)) return raw;
            if (raw && Array.isArray((raw as { data: unknown[] }).data)) return (raw as { data: unknown[] }).data;
            return [];
        },
        enabled: !!projectId && projectId !== 'all',
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    if (!projectId || projectId === 'all') return null;

    if (!isLoading && sites.length === 0) return null;

    return (
        <div className={cn("relative", className)}>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger className="bg-slate-900/50 border-white/10 h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all hover:bg-slate-800/50 hover:border-emerald-500/30 focus:ring-emerald-500/20">
                    <div className="flex items-center gap-2 truncate">
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                        ) : (
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <SelectValue placeholder={placeholder} />
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 backdrop-blur-xl max-h-[300px]">
                    {showAll && (
                        <SelectItem
                            value="all"
                            className="text-[11px] font-bold uppercase tracking-wider focus:bg-emerald-500 focus:text-black"
                        >
                            Todos os Canteiros
                        </SelectItem>
                    )}
                    {sites.map((site: { id: string, name: string }) => (
                        <SelectItem
                            key={site.id}
                            value={site.id}
                            className="text-[11px] font-bold uppercase tracking-wider focus:bg-emerald-500 focus:text-black"
                        >
                            {site.name}
                        </SelectItem>
                    ))}
                    {!isLoading && sites.length === 0 && (
                        <div className="px-2 py-4 text-center text-[10px] text-muted-foreground uppercase font-bold italic">
                            Nenhum canteiro encontrado
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
});
