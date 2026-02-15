import { useState, useEffect, useCallback } from 'react';
import { orionApi } from "@/integrations/orion/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface WorkStage {
  id: string;
  siteId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  weight: number;
  displayOrder: number;
  productionActivityId?: string | null;
  createdAt: Date;
  progress?: {
    actualPercentage: number;
    plannedPercentage: number;
  };
  metadata?: any;
}

export interface CreateStageData {
  name: string;
  description?: string;
  weight?: number;
  parentId?: string;
  displayOrder?: number;
  productionActivityId?: string | null;
  metadata?: any;
}

export function useWorkStages(
  siteId?: string,
  projectId?: string,
  linkedOnly?: boolean,
) {
  const [stages, setStages] = useState<WorkStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  const loadStages = useCallback(async () => {
    // If we don't even have a project, we can't load stages in the new model
    if (!projectId && (!siteId || siteId === "all")) {
      setStages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (siteId && siteId !== "all") params.append("siteId", siteId);
      if (projectId && projectId !== "all")
        params.append("projectId", projectId);
      if (profile?.companyId) params.append("companyId", profile.companyId);
      if (linkedOnly) params.append("linkedOnly", "true");

      const response = await orionApi.get(`/work-stages?${params.toString()}`);
      const data = (response.data as unknown[]) || [];
      const mapped: WorkStage[] = data.map((s: any) => {
        const latestProgress = s.progress?.[0] || {
          actualPercentage: 0,
          plannedPercentage: 0,
        };
        return {
          id: s.id,
          siteId: s.siteId,
          parentId: s.parentId,
          name: s.name,
          description: s.description,
          weight: Number(s.weight),
          displayOrder: s.displayOrder,
          createdAt: new Date(s.createdAt),
          progress: {
            actualPercentage: Number(latestProgress.actualPercentage || 0),
            plannedPercentage: Number(latestProgress.plannedPercentage || 0),
          },
          productionActivityId: s.productionActivityId,
          metadata: s.metadata,
        };
      });

      setStages(mapped);
    } catch (error: any) {
      console.error("Erro ao carregar etapas de obra:", error);
      setStages([]);
    } finally {
      setIsLoading(false);
    }
  }, [siteId, projectId, linkedOnly, profile?.companyId]);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const createStage = async (data: CreateStageData, silent = false) => {
    try {
      const response = await orionApi.post("/work-stages", {
        siteId,
        projectId, // Pass project context
        name: data.name,
        description: data.description || null,
        weight: data.weight || 1.0,
        parentId: data.parentId || null,
        displayOrder: data.displayOrder ?? stages.length,
        productionActivityId: data.productionActivityId || null,
      });

      if (response.error) {
        throw new Error(
          response.error.message || "Erro desconhecido ao criar etapa",
        );
      }

      if (!silent) {
        toast({
          title: "Etapa criada",
          description: `A etapa "${data.name}" foi criada com sucesso.`,
        });
        loadStages();
      }

      // Retorna o ID da etapa criada
      const createdId = (response.data as any)?.id;
      console.log("[CriarEtapa] Etapa criada:", data.name, "ID:", createdId);
      return { success: true, stageId: createdId };
    } catch (error: any) {
      console.error("[createStage] Error:", error);
      if (!silent) {
        toast({
          title: "Erro ao criar etapa",
          description: error.message,
          variant: "destructive",
        });
      }
      return { success: false, error: error.message };
    }
  };

  /**
   * Cria múltiplas etapas em lote com um pequeno intervalo entre elas
   * para evitar erro 429 Too Many Requests.
   */
  const bulkCreateStages = async (items: CreateStageData[], silent = true) => {
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const result = await createStage(items[i], silent);
      results.push(result);
      // Intervalo de 200ms entre requisições para blindagem contra 429
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    await loadStages();
    return results;
  };

  const updateStage = async (
    stageId: string,
    data: Partial<CreateStageData>,
  ) => {
    try {
      await orionApi.put(`/work-stages/${stageId}`, data);

      toast({
        title: "Etapa atualizada",
        description: "A etapa foi atualizada com sucesso.",
      });
      loadStages();
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar etapa",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const deleteStage = async (stageId: string) => {
    try {
      await orionApi.delete(`/work-stages/${stageId}`);

      toast({
        title: "Etapa removida",
        description: "A etapa foi removida com sucesso.",
      });
      loadStages();
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro ao remover etapa",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const updateProgress = async (
    stageId: string,
    actual: number,
    planned: number,
    notes?: string,
  ) => {
    try {
      await orionApi.post("/stage-progress", {
        stageId,
        actualPercentage: actual,
        plannedPercentage: planned,
        notes,
        updatedById: profile?.id,
      });

      toast({
        title: "Avanço registrado",
        description: "O progresso da etapa foi atualizado com sucesso.",
      });
      loadStages();
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro ao registrar avanço",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const deleteAllStages = async () => {
    try {
      await orionApi.delete(`/work-stages/bulk?siteId=${siteId}`);
      toast({
        title: "Etapas removidas",
        description: "Todas as etapas foram removidas com sucesso.",
      });
      loadStages();
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro ao remover etapas",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const reorderStages = async (reorderedStages: WorkStage[]) => {
    try {
      const updates = reorderedStages.map((stage, index) => ({
        id: stage.id,
        displayOrder: index,
      }));

      await orionApi.put("/work-stages/reorder", { updates });
      setStages(reorderedStages);
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
      loadStages(); // Revert to server state
      return { success: false, error: error.message };
    }
  };

  const syncStages = async () => {
    // We now support syncing by project if siteId is 'all'
    try {
      await orionApi.post("/work-stages/sync", {
        siteId: siteId === "all" ? undefined : siteId,
        projectId,
      });
      await loadStages();
      return { success: true };
    } catch (error: any) {
      console.error("[SincronizarEtapas] Erro:", error);
      return { success: false, error: error.message };
    }
  };

  return {
    stages,
    isLoading,
    createStage,
    bulkCreateStages,
    updateStage,
    deleteStage,
    deleteAllStages,
    reorderStages,
    updateProgress,
    syncStages, // New method
    refresh: loadStages,
  };
}
