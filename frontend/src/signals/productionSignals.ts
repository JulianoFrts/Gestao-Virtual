import { signal, computed } from "@preact/signals-react";
import { db } from "@/integrations/database";
import { TowerProductionData } from "@/modules/production/types";

// ==========================================
// STATE SIGNALS
// ==========================================

/** Torres carregadas por stage ID */
export const towersByStage = signal<Record<string, TowerProductionData[]>>({});

/** Todas as torres carregadas (cache) */
export const allTowers = signal<TowerProductionData[]>([]);

/** Stage ID atualmente selecionado */
export const selectedStageId = signal<string | null>(null);

/** Estado de loading */
export const isLoadingProduction = signal<boolean>(false);

/** Se já carregou os dados pelo menos uma vez */
export const hasLoadedProduction = signal<boolean>(false);

/** Filtros atuais (projectId, siteId, companyId) */
export const productionFilters = signal<{
  projectId: string | null;
  siteId: string | null;
  companyId: string | null;
}>({
  projectId: null,
  siteId: null,
  companyId: null,
});

// ==========================================
// COMPUTED SIGNALS
// ==========================================

/** Torres do stage atualmente selecionado */
export const currentStageTowers = computed(() => {
  const stageId = selectedStageId.value;
  if (!stageId) return [];
  return towersByStage.value[stageId] || [];
});

/** Total de torres finalizadas em todos os stages */
export const totalFinishedTowers = computed(() => {
  const byStage = towersByStage.value;
  let total = 0;
  Object.values(byStage).forEach((towers) => {
    total += towers.length;
  });
  return total;
});

// ==========================================
// ACTIONS
// ==========================================

interface WorkStage {
  id: string;
  name?: string;
  productionActivityId?: string | null;
}

/** Carrega todas as torres para um conjunto de stages */
export const loadProductionData = async (
  stages: WorkStage[],
  filters: { projectId?: string; siteId?: string; companyId?: string },
) => {
  if (isLoadingProduction.value) return;

  // Verificar se os filtros mudaram
  const currentFilters = productionFilters.value;
  const filtersChanged =
    currentFilters.projectId !== (filters.projectId || null) ||
    currentFilters.siteId !== (filters.siteId || null) ||
    currentFilters.companyId !== (filters.companyId || null);

  // Se já carregou e os filtros não mudaram, não recarrega
  if (hasLoadedProduction.value && !filtersChanged) return;

  isLoadingProduction.value = true;

  try {
    const queryParams: Record<string, string> = {};
    if (filters.projectId && filters.projectId !== "all") {
      queryParams.projectId = filters.projectId;
    }
    if (filters.siteId && filters.siteId !== "all") {
      queryParams.siteId = filters.siteId;
    }
    if (filters.companyId) {
      queryParams.companyId = filters.companyId;
    }

    console.log(
      `[ProductionSignals] Buscando torres da API com filtros:`,
      queryParams,
    );

    // Usar db.from() que inclui o token de autenticação
    let query = db.from("map_element_production_progress").select("*");
    if (queryParams.projectId)
      query = query.eq("projectId", queryParams.projectId);
    if (queryParams.siteId) query = query.eq("siteId", queryParams.siteId);
    if (queryParams.companyId)
      query = query.eq("companyId", queryParams.companyId);

    const { data: towers, error } = await query;
    if (error) throw error;

    console.log(
      `[ProductionSignals] API retornou ${towers?.length || 0} torres`,
    );

    // Armazenar todas as torres no cache
    allTowers.value = towers || [];
    hasLoadedProduction.value = true;

    // Atualizar filtros para o cache
    productionFilters.value = {
      projectId: filters.projectId || null,
      siteId: filters.siteId || null,
      companyId: filters.companyId || null,
    };

    // Processar o mapeamento por stage
    processStagesMapping(stages, towers);
  } catch (error) {
    console.error("[ProductionSignals] Erro ao carregar dados:", error);
  } finally {
    isLoadingProduction.value = false;
  }
};

/** Lógica central de mapeamento (pode ser chamada sem fetch se o cache for válido) */
export const processStagesMapping = (
  stages: WorkStage[],
  towers: TowerProductionData[],
) => {
  console.log(
    `[ProductionSignals] Processando mapeamento para ${stages.length} estágios e ${towers.length} torres`,
  );

  const result: Record<string, TowerProductionData[]> = {};

  stages.forEach((stage) => {
    const activityId = stage.productionActivityId || stage.id;

    const finishedTowers = (towers || []).filter((tower) => {
      const statuses = tower.activityStatuses || [];
      return statuses.some((s) => {
        const matchById =
          s.activityId === activityId ||
          s.activity?.id === activityId ||
          s.activity?.productionActivityId === activityId;

        // Fallback por nome se IDs falharem (ajuda muito em dados legados)
        const activityName = (s.activity?.name || "").trim().toLowerCase();
        const stageName = (stage.name || "").trim().toLowerCase();
        const matchByName =
          stageName && activityName && activityName.includes(stageName);

        const statusStr = (s.status as string) || "";
        const isFinished =
          statusStr === "FINISHED" ||
          statusStr === "COMPLETED" ||
          (s.progressPercent || 0) >= 100;

        return (matchById || matchByName) && isFinished;
      });
    });

    result[stage.id] = finishedTowers;

    if (finishedTowers.length > 0) {
      console.log(
        `[ProductionSignals] ✅ ${stage.name}: ${finishedTowers.length} torres`,
      );
    }
  });

  towersByStage.value = result;

  // Selecionar primeiro stage se nenhum selecionado
  if (!selectedStageId.value && stages.length > 0) {
    console.log(
      `[ProductionSignals] Auto-selecionando primeiro estágio: ${stages[0].name}`,
    );
    selectedStageId.value = stages[0].id;
  }
};

/** Seleciona um stage */
export const selectStage = (stageId: string) => {
  selectedStageId.value = stageId;
};

/** Reseta o estado (quando muda de projeto/site) */
export const resetProductionState = () => {
  towersByStage.value = {};
  allTowers.value = [];
  hasLoadedProduction.value = false;
  selectedStageId.value = null;
};

/** Obtém contagem de torres para um stage */
export const getTowerCount = (stageId: string): number => {
  return towersByStage.value[stageId]?.length ?? 0;
};
