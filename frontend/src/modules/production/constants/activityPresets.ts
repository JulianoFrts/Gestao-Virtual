/**
 * Padrões pré-definidos de Atividades para projetos de Linhas de Transmissão.
 * Cada categoria é uma "Atividade Mãe" (level 1) com sub-metas (level 2).
 */
export interface ActivityPresetItem {
  name: string;
  unit: string;
  price: number;
  order: number;
}

export interface ActivityPresetCategory {
  name: string;
  order: number;
  activities: ActivityPresetItem[];
}

export const ACTIVITY_PRESETS: ActivityPresetCategory[] = [
  {
    name: "SERVIÇOS PRELIMINARES",
    order: 1,
    activities: [
      { name: "Croqui de Acesso", unit: "KM", price: 5000, order: 1 },
      { name: "Sondagem", unit: "UN", price: 1250, order: 2 },
      { name: "Conferência de Perfil", unit: "UN", price: 850, order: 3 },
      { name: "Supressão Vegetal (Área)", unit: "m²", price: 12.5, order: 4 },
      { name: "Abertura de Acessos", unit: "UN", price: 4200, order: 5 },
    ],
  },
  {
    name: "FUNDAÇÕES",
    order: 2,
    activities: [
      { name: "Armação (Mastro/Pé)", unit: "UN", price: 9200, order: 1 },
      { name: "Escavação (Mastro/Pé)", unit: "UN", price: 18500, order: 2 },
      { name: "Concretagem (Mastro/Pé)", unit: "UN", price: 35000, order: 3 },
      { name: "Nivelamento / Preparação", unit: "UN", price: 1500, order: 4 },
      { name: "Reaterro", unit: "UN", price: 0, order: 5 },
    ],
  },
  {
    name: "MONTAGEM",
    order: 3,
    activities: [
      { name: "Pré-Montagem", unit: "UN", price: 0, order: 1 },
      { name: "Içamento", unit: "UN", price: 0, order: 2 },
      { name: "Revisão", unit: "UN", price: 0, order: 3 },
      { name: "Torqueamento", unit: "UN", price: 0, order: 4 },
    ],
  },
  {
    name: "CABOS",
    order: 4,
    activities: [
      { name: "Lançamento Cabo Guia", unit: "UN", price: 0, order: 1 },
      { name: "Lançamento Condutor", unit: "UN", price: 0, order: 2 },
      { name: "Grampeação", unit: "UN", price: 0, order: 3 },
      { name: "Regulação", unit: "UN", price: 0, order: 4 },
    ],
  },
];
