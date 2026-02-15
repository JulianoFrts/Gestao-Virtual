import React, { useState } from 'react';
import { ProductionCategory } from '@/modules/production/types';
import { Button } from '@/components/ui/button';
import { Check, Info, Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { orionApi } from '@/integrations/orion/client';
import { cn } from '@/lib/utils';
import { WorkStage, CreateStageData } from '@/hooks/useWorkStages';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface StageHeaderSelectorProps {
    stage: WorkStage;
    onUpdate: (stageId: string, payload: Partial<CreateStageData>) => Promise<void>;
}

export const StageHeaderSelector: React.FC<StageHeaderSelectorProps> = ({ stage, onUpdate }) => {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Always fetch categories to allow auto-matching
    const { data: categories } = useQuery({
        queryKey: ['production-categories'],
        queryFn: async () => {
            const res = await orionApi.get('/production/categories');
            return (res.data as ProductionCategory[]) || [];
        },
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    const currentActivityId = stage.productionActivityId;
    const hasActivity = !!currentActivityId && currentActivityId !== 'none';
    const isMapEnabled = hasActivity && stage.metadata?.mapEnabled !== false;

    // Visual state tracks "Is Map Enabled" (Green Check) vs "Disabled" (Red X)
    const isLinked = isMapEnabled;

    const handleToggle = async () => {
        if (isLoading) return;

        if (isLinked) {
            // Deactivating -> Show Warning
            setIsAlertOpen(true);
        } else {
            // Activating -> Enable Map (and link if needed)
            await activateLink();
        }
    };

    const activateLink = async () => {
        setIsLoading(true);
        try {
            if (hasActivity) {
                // Just enable the map flag
                await onUpdate(stage.id, { 
                    metadata: { ...stage.metadata, mapEnabled: true } 
                });
                toast.success("Visualização no Mapa ativada");
            } else {
                // Try to find activity with exact same name
                let matchId = '';
                
                if (categories) {
                    for (const cat of categories) {
                        const match = cat.activities.find(a => a.name.trim().toLowerCase() === stage.name.trim().toLowerCase());
                        if (match) {
                            matchId = match.id;
                            break;
                        }
                    }
                }

                if (matchId) {
                    await onUpdate(stage.id, { 
                        productionActivityId: matchId,
                        metadata: { ...stage.metadata, mapEnabled: true }
                    });
                    toast.success("Atividade vinculada e visualização ativada");
                } else {
                     toast.error(`Não foi encontrada uma atividade de produção correspondente para "${stage.name}". Verifique o nome.`);
                }
            }
        } catch {
            toast.error("Erro ao ativar visualização");
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDeactivate = async () => {
        setIsAlertOpen(false);
        setIsLoading(true);
        try {
            // ONLY disable the map flag, do NOT unlink the activity data
            await onUpdate(stage.id, { 
                metadata: { ...stage.metadata, mapEnabled: false } 
            }); 
            toast.info("Visualização no Mapa desativada (Dados mantidos)");
        } catch {
            toast.error("Erro ao desativar visualização");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="w-full flex items-center justify-between gap-2 px-1">
                <span className="truncate max-w-[90px] text-[10px] font-medium" title={stage.name}>
                    {stage.name}
                </span>
                
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-6 w-6 rounded-full border transition-all",
                        isLinked 
                            ? "bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30" 
                            : "bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30"
                    )}
                    onClick={handleToggle}
                    disabled={isLoading}
                    title={isLinked ? "Ativo (Vinculado ao Mapa)" : "Visualização Desativada (Dados Mantidos)"}
                >
                    {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        isLinked ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <X className="h-3 w-3" />
                        )
                    )}
                </Button>
            </div>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
                            <Info className="h-5 w-5" />
                            Desativar Visualização 3D?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Ao desativar esta opção, o avanço desta etapa <strong>deixará de ser colorido no Mapa 3D</strong>.
                            <br/><br/>
                            <span className="text-green-400 font-bold">Importante:</span> Os dados de execução na tabela <strong>serão mantidos</strong> e continuarão visíveis. Apenas a visualização no mapa será desligada.
                            <br/><br/>
                            Deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDeactivate}
                            className="bg-red-900 border-red-800 hover:bg-red-800 text-red-100"
                        >
                            Sim, Desativar Visual
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
