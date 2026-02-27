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
      { name: "Passivo Ambiental", unit: "UN", price: 0, order: 3 },
      { name: "Conferência de Perfil", unit: "UN", price: 850, order: 4 },
      { name: "Marcação de Cavas", unit: "UN", price: 0, order: 5 },
      { name: "Seção Diagonal", unit: "UN", price: 0, order: 6 },
      { name: "Supressão Vegetal (Área)", unit: "m²", price: 12.5, order: 7 },
      { name: "Supressão Vegetal (Faixa)", unit: "m²", price: 0, order: 8 },
      { name: "Supressão Vegetal (Corte)", unit: "UN", price: 0, order: 9 },
      { name: "Abertura de Acessos", unit: "UN", price: 4200, order: 10 },
      { name: "Recuperação de Acesso", unit: "UN", price: 0, order: 11 },
    ],
  },
  {
    name: "FUNDAÇÕES",
    order: 2,
    activities: [
      { name: "Escavação (Mastro/Pé)", unit: "UN", price: 18500, order: 1 },
      { name: "Cravação de Estacas", unit: "UN", price: 0, order: 2 },
      { name: "Armação (Mastro/Pé)", unit: "UN", price: 9200, order: 3 },
      { name: "Nivelamento / Preparação", unit: "UN", price: 1500, order: 4 },
      { name: "Concretagem (Mastro/Pé)", unit: "UN", price: 35000, order: 5 },
      { name: "Reaterro (Mastro/Pé)", unit: "UN", price: 0, order: 6 },
      { name: "Ensaio de Arrancamento", unit: "UN", price: 0, order: 7 },
      { name: "Fundação 100%", unit: "UN", price: 0, order: 8 },
    ],
  },
  {
    name: "SISTEMAS DE ATERRAMENTO",
    order: 3,
    activities: [
      { name: "Instalação Cabo Contrapeso", unit: "UN", price: 0, order: 1 },
      { name: "Medição de Resistência", unit: "UN", price: 0, order: 2 },
      { name: "Aterramento de Cercas", unit: "UN", price: 0, order: 3 },
    ],
  },
  {
    name: "MONTAGEM DE TORRES",
    order: 4,
    activities: [
      { name: "Distribuição / Transporte", unit: "UN", price: 0, order: 1 },
      { name: "Pré-montagem em Solo", unit: "UN", price: 0, order: 2 },
      { name: "Montagem / Içamento", unit: "UN", price: 0, order: 3 },
      { name: "Revisão Final / Flambagem", unit: "UN", price: 0, order: 4 },
      { name: "Giro e Prumo", unit: "UN", price: 0, order: 5 },
    ],
  },
  {
    name: "LANÇAMENTO DE CABOS",
    order: 5,
    activities: [
      { name: "Instalação de Cavaletes", unit: "UN", price: 0, order: 1 },
      { name: "Lançamento de Cabo Piloto", unit: "UN", price: 0, order: 2 },
      { name: "Lançamento de Para-raios", unit: "UN", price: 0, order: 3 },
      { name: "Cadeias e Bandolas", unit: "UN", price: 0, order: 4 },
      { name: "Lançamento de Condutores", unit: "UN", price: 0, order: 5 },
      { name: "Nivelamento e Grampeação", unit: "UN", price: 0, order: 6 },
      { name: "Jumpers / Espaçadores", unit: "UN", price: 0, order: 7 },
      { name: "Esferas de Sinalização", unit: "UN", price: 0, order: 8 },
      { name: "Defensas de Estais", unit: "UN", price: 0, order: 9 },
      { name: "Entrega Final / Comissionamento", unit: "UN", price: 0, order: 10 },
    ],
  },
];
