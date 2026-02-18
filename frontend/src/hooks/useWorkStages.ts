import { useCallback, useEffect, useRef } from 'react';
import { orionApi } from "@/integrations/orion/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  workStagesSignal,
  isWorkStagesLoadingSignal,
  fetchWorkStages,
  hasWorkStagesFetchedSignal,
} from "@/signals/workStageSignals";
import type { WorkStage } from "@/signals/workStageSignals";

export type { WorkStage };

export interface CreateStageData {
  name: string;
  description?: string;
  weight?: number;
  parentId?: string;
  displayOrder?: number;
  productionActivityId?: string | null;
  metadata?: any;
  children?: CreateStageData[]; // Para suporte a bulk hierárquico
}

export function useWorkStages(
  siteId?: string,
  projectId?: string,
  linkedOnly?: boolean,
  companyId?: string,
) {
  const stages = workStagesSignal.value;
  const isLoading = isWorkStagesLoadingSignal.value;
  const { toast } = useToast();
  const { profile } = useAuth();

  const loadStages = useCallback(async () => {
    await fetchWorkStages(true, siteId, projectId, companyId);
  }, [siteId, projectId, companyId]);

  // Recarregar quando parâmetros mudam
  const lastParamsRef = useRef<string>("");

  useEffect(() => {
    const paramsKey = `${siteId}-${projectId}-${companyId}`;
    if (paramsKey === lastParamsRef.current) return;
    
    // Se temos parâmetros válidos, forçamos o carregamento para garantir dados atualizados
    // especialmente se mudamos de contexto (ex: 'all' -> 'project-id')
    if (siteId || projectId || companyId) {
        lastParamsRef.current = paramsKey;
        // Force fetch if we are switching contexts
        fetchWorkStages(true, siteId, projectId, companyId).catch(console.error);
    }
  }, [siteId, projectId, companyId]);

  // Fallback inicial (similar ao anterior mas dentro do effect agora)

  const createStage = async (data: CreateStageData, silent = false) => {
    try {
      const response = await orionApi.post("/work_stages", {
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
    try {
      const response = await orionApi.post("/work_stages/bulk", {
        siteId,
        projectId,
        data: items,
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar etapas em lote");
      }

      if (!silent) {
        toast({
          title: "Importação concluída",
          description: "As etapas foram importadas com sucesso.",
        });
      }
      
      await loadStages();
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error("[bulkCreateStages] Error:", error);
      if (!silent) {
        toast({
          title: "Erro na importação",
          description: error.message,
          variant: "destructive",
        });
      }
      return { success: false, error: error.message };
    }
  };

  const updateStage = async (
    stageId: string,
    data: Partial<CreateStageData>,
  ) => {
    try {
      await orionApi.put(`/work_stages/${stageId}`, data);

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
      await orionApi.delete(`/work_stages/${stageId}`);

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
      await orionApi.post("/stage_progress", {
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
      await orionApi.delete(`/work_stages/bulk?siteId=${siteId}`);
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

      await orionApi.put("/work_stages/reorder", { updates });
      workStagesSignal.value = reorderedStages;
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
      await orionApi.post("/work_stages/sync", {
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
