import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HardHat, Plus, Upload, Users, MapPin, Construction, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectEmptyStateProps {
    title: string;
    description: string;
    type: 'towers' | 'sites' | 'workers' | 'generic';
    onAction?: () => void;
    onSecondaryAction?: () => void;
    actionLabel?: string;
    secondaryActionLabel?: string;
    className?: string;
    hideAction?: boolean;
}

export function ProjectEmptyState({
    title,
    description,
    type,
    onAction,
    onSecondaryAction,
    actionLabel,
    secondaryActionLabel,
    className,
    hideAction
}: ProjectEmptyStateProps) {
    const getIcon = () => {
        switch (type) {
            case 'towers': return <Construction className="w-12 h-12 text-primary" />;
            case 'sites': return <MapPin className="w-12 h-12 text-amber-500" />;
            case 'workers': return <Users className="w-12 h-12 text-sky-500" />;
            default: return <AlertCircle className="w-12 h-12 text-primary" />;
        }
    };

    return (
        <Card className={cn("bg-black/40 border-white/5 backdrop-blur-xl border-dashed border-2 py-12 px-6 text-center shadow-2xl overflow-hidden relative group", className)}>
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700" />

            <CardContent className="relative flex flex-col items-center gap-6">
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    {getIcon()}
                </div>

                <div className="space-y-2 max-w-sm">
                    <h3 className="text-xl font-black tracking-tight text-foreground uppercase italic">{title}</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                    {onAction && !hideAction && (
                        <Button
                            onClick={onAction}
                            className="gradient-primary text-primary-foreground font-black uppercase tracking-wider h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.05] active:scale-95 transition-all text-xs"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {actionLabel || 'Adicionar Novo'}
                        </Button>
                    )}

                    {onSecondaryAction && (
                        <Button
                            variant="outline"
                            onClick={onSecondaryAction}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-bold uppercase tracking-widest h-11 px-6 rounded-xl text-[10px] transition-all"
                        >
                            <Upload className="w-4 h-4 mr-2 text-primary" />
                            {secondaryActionLabel || 'Importar Dados'}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
