/**
 * Constantes de Regras de Negócio
 * Definições de hierarquia de cargos, categorias de produção e pesos.
 */

const _INTERNAL = {
  RANK: {
    MGR: 1,
    COORD: 2,
    ENG: 3,
    LDR: 4,
    TECH: 5,
    OPR: 6,
    SKL: 8,
    DEF: 10,
    HLP: 11,
  },
};

// Hierarquia de Cargos (Menor número = Maior hierarquia organizacional)
// Diferente de ROLE_LEVELS onde maior número = maior permissão de sistema.
export const JOB_HIERARCHY = {
  MANAGER: _INTERNAL.RANK.MGR,
  COORDINATOR: _INTERNAL.RANK.COORD,
  ENGINEER: _INTERNAL.RANK.ENG,
  LEADER: _INTERNAL.RANK.LDR,
  TECHNICIAN: _INTERNAL.RANK.TECH,
  OPERATOR: _INTERNAL.RANK.OPR,
  SKILLED: _INTERNAL.RANK.SKL,
  DEFAULT: _INTERNAL.RANK.DEF,
  HELPER: _INTERNAL.RANK.HLP,
} as const;

export const PASSWORD_HASHES = {
  DEFAULT_SEED: "$2b$10$EpWa/z.6q.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1",
} as const;

export const PRODUCTION_CONFIG = {
  CATEGORIES: [
    {
      name: "Serviços Preliminares",
      order: 1,
      description: "Atividades preparatórias para início da obra",
      activities: [
        { name: "Croqui de Acesso", order: 1, weight: 1 },
        { name: "Sondagem", order: 2, weight: 1 },
        { name: "Passivo Ambiental", order: 3, weight: 1 },
        { name: "Conferência de Perfil", order: 4, weight: 1 },
        { name: "Marcação de Cavas", order: 5, weight: 1 },
        { name: "Seção Diagonal", order: 6, weight: 1 },
        { name: "Supressão Vegetal (Área)", order: 7, weight: 1 },
        { name: "Supressão Vegetal (Faixa)", order: 8, weight: 1 },
        { name: "Supressão Vegetal (Corte)", order: 9, weight: 1 },
        { name: "Abertura de Acessos", order: 10, weight: 2 },
        { name: "Recuperação de Acesso", order: 11, weight: 1 },
      ],
    },
    {
      name: "Fundações",
      order: 2,
      description: "Etapa de escavação, armação e concretagem das bases",
      activities: [
        { name: "Escavação (Mastro/Pé)", order: 1, weight: 3 },
        { name: "Cravação de Estacas", order: 2, weight: 3 },
        { name: "Armação (Mastro/Pé)", order: 3, weight: 2 },
        { name: "Nivelamento / Preparação", order: 4, weight: 2 },
        { name: "Concretagem (Mastro/Pé)", order: 5, weight: 5 },
        { name: "Reaterro (Mastro/Pé)", order: 6, weight: 2 },
        { name: "Ensaio de Arrancamento", order: 7, weight: 1 },
        { name: "Fundação 100%", order: 8, weight: 1 },
      ],
    },
    {
      name: "Sistemas de Aterramento",
      order: 3,
      description: "Instalação e medição de sistemas de aterramento",
      activities: [
        { name: "Instalação Cabo Contrapeso", order: 1, weight: 2 },
        { name: "Medição de Resistência", order: 2, weight: 1 },
        { name: "Aterramento de Cercas", order: 3, weight: 1 },
      ],
    },
    {
      name: "Montagem de Torres",
      order: 4,
      description: "Montagem e içamento das estruturas metálicas",
      activities: [
        { name: "Distribuição / Transporte", order: 1, weight: 1 },
        { name: "Pré-montagem em Solo", order: 2, weight: 3 },
        { name: "Montagem / Içamento", order: 3, weight: 7 },
        { name: "Revisão Final / Flambagem", order: 4, weight: 1 },
        { name: "Giro e Prumo", order: 5, weight: 1 },
      ],
    },
    {
      name: "Lançamento de Cabos",
      aliases: ["Cabos"],
      order: 5,
      description: "Lançamento e regulação de cabos condutores e para-raios",
      activities: [
        { name: "Instalação de Cavaletes", order: 1, weight: 1 },
        { name: "Lançamento de Cabo Piloto", order: 2, weight: 2 },
        { name: "Lançamento de Para-raios", order: 3, weight: 3 },
        { name: "Cadeias e Bandolas", order: 4, weight: 2 },
        { name: "Lançamento de Condutores", order: 5, weight: 10 },
        { name: "Nivelamento e Grampeação", order: 6, weight: 3 },
        { name: "Jumpers / Espaçadores", order: 7, weight: 2 },
        { name: "Esferas de Sinalização", order: 8, weight: 1 },
        { name: "Defensas de Estais", order: 9, weight: 1 },
        { name: "Entrega Final / Comissionamento", order: 10, weight: 1 },
      ],
    },
  ],
} as const;
