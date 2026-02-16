import { signal } from "@preact/signals-react";
import { orionApi } from "@/integrations/orion/client";
import { isLoadingDataSignal } from "./syncSignals";

export interface ProductionCategory {
  id: string;
  name: string;
  // Outros campos conforme necessário
}

export const productionCategoriesSignal = signal<ProductionCategory[]>([]);
export const isProductionLoadingSignal = signal<boolean>(false);
export const hasProductionFetchedSignal = signal<boolean>(false);

let lastFetchTime = 0;
const FETCH_COOLDOWN = 30000; // 30s cooldown

export const fetchProductionData = async (force = false) => {
  const now = Date.now();
  if (isProductionLoadingSignal.value || (!force && now - lastFetchTime < FETCH_COOLDOWN)) {
    return;
  }

  // Se não houver token, aborta silenciosamente
  if (!orionApi.token) return;

  isProductionLoadingSignal.value = true;
  lastFetchTime = now;

  try {
    // Carregar Categorias (Principal dado de bootstrap da produção)
    const { data, error } = await orionApi.get<ProductionCategory[]>('/production/categories');

    if (error) {
      console.warn("[ProductionSignals] Error fetching categories:", error);
      // Não lançamos erro para não quebrar o loader global, apenas logamos
    } else if (data) {
      productionCategoriesSignal.value = data;
    }

  } catch (err) {
    console.error("[ProductionSignals] Unexpected error:", err);
  } finally {
    isProductionLoadingSignal.value = false;
    hasProductionFetchedSignal.value = true;
  }
};
