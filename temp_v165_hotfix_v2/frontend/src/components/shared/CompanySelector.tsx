import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { orionApi } from "@/integrations/orion/client";
import { Building, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanySelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export const CompanySelector = React.memo(function CompanySelector({
    value,
    onValueChange,
    className,
    placeholder = "Selecione a Empresa"
}: CompanySelectorProps) {
    const { profile } = useAuth();
    
    // Access Control: Only visible for SUPER_ADMIN, SUPER_ADMIN_GOD, ADMIN, TI_SOFTWARE
    const isAdmin = profile?.role && ['SUPER_ADMIN', 'SUPER_ADMIN_GOD', 'ADMIN', 'TI_SOFTWARE'].includes(profile.role);

    const { data: companies = [], isLoading } = useQuery({
        queryKey: ['companies-list'],
        queryFn: async () => {
            const res = await orionApi.get('/companies');
            return res.data;
        },
        enabled: !!isAdmin, // Only fetch if admin
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    if (!isAdmin) return null;

    return (
        <div className={cn("relative", className)}>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger className="bg-slate-900/50 border-white/10 h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all hover:bg-slate-800/50 hover:border-amber-500/30 focus:ring-amber-500/20">
                    <div className="flex items-center gap-2 truncate">
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                        ) : (
                            <Building className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <SelectValue placeholder={placeholder} />
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 backdrop-blur-xl max-h-[300px]">
                    <SelectItem
                        value="all"
                        className="text-[11px] font-bold uppercase tracking-wider focus:bg-amber-500 focus:text-black"
                    >
                        Todas as Empresas
                    </SelectItem>
                    {companies.map((company: { id: string, name: string }) => (
                        <SelectItem
                            key={company.id}
                            value={company.id}
                            className="text-[11px] font-bold uppercase tracking-wider focus:bg-amber-500 focus:text-black"
                        >
                            {company.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
});
