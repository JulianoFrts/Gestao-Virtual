import { signal } from "@preact/signals-react";
import { orionApi } from "@/integrations/orion/client";
import { storageService } from "@/services/storageService";

export interface WorkStage {
    id: string;
    siteId: string;
    parentId: string | null;
    name: string;
    description: string | null;
    weight: number;
    displayOrder: number;
    productionActivityId?: string | null;
    createdAt: string;
    progress?: {
        actualPercentage: number;
        plannedPercentage: number;
    };
    metadata?: any;
}

export const workStagesSignal = signal<WorkStage[]>([]);
export const isWorkStagesLoadingSignal = signal<boolean>(false);
export const hasWorkStagesFetchedSignal = signal<boolean>(false);

export const fetchWorkStages = async (force = false, siteId?: string, projectId?: string) => {
    // Se não for forçado e já tivermos carregado universalmente ou para o contexto atual, podemos pular? 
    // Por simplicidade na inicialização, focamos no carregamento global se siteId/projectId omitidos
    if (!force && hasWorkStagesFetchedSignal.value && workStagesSignal.value.length > 0) return;

    isWorkStagesLoadingSignal.value = true;
    try {
        const params: Record<string, string> = {};
        if (siteId && siteId !== "all") params.siteId = siteId;
        if (projectId && projectId !== "all") params.projectId = projectId;

        const response = await orionApi.get<WorkStage[]>("/work_stages", params);

        if (response.data) {
            const mapped: WorkStage[] = response.data.map((s: any) => {
                const latestProgress = s.progress?.[0] || {
                    actualPercentage: 0,
                    plannedPercentage: 0,
                };
                return {
                    ...s,
                    id: s.id,
                    weight: Number(s.weight || 0),
                    progress: {
                        actualPercentage: Number(latestProgress.actualPercentage || 0),
                        plannedPercentage: Number(latestProgress.plannedPercentage || 0),
                    }
                };
            });

            workStagesSignal.value = mapped;
            hasWorkStagesFetchedSignal.value = true;
            storageService.setItem("work_stages", mapped).catch(console.error);
        }
    } catch (error) {
        console.error("[fetchWorkStages] Error:", error);
        // Fallback to cache
        const cached = await storageService.getItem<WorkStage[]>("work_stages");
        if (cached) {
            workStagesSignal.value = cached;
        }
    } finally {
        hasWorkStagesFetchedSignal.value = true;
        isWorkStagesLoadingSignal.value = false;
        console.log("[fetchWorkStages] Finished. Signal set to true.");
    }
};
