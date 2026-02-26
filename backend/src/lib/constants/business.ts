
/**
 * Constantes de Regras de Negócio
 * Definições de hierarquia de cargos, categorias de produção e pesos.
 */

const _INTERNAL = {
    RANK: { MGR: 1, COORD: 2, ENG: 3, LDR: 4, TECH: 5, OPR: 6, SKL: 8, DEF: 10, HLP: 11 },
    PROD: { CAT1: 10, CAT2: 20, CAT3: 30, ACT1: 1, ACT2: 2, ACT3: 3, ACT4: 4 }
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
            name: "Fundação",
            order: _INTERNAL.PROD.CAT1,
            description: "Etapa de escavação e concretagem das bases",
            activities: [
                { name: "Escavação", order: _INTERNAL.PROD.ACT1, weight: 1.0 },
                { name: "Armação", order: _INTERNAL.PROD.ACT2, weight: 1.0 },
                { name: "Concretagem", order: _INTERNAL.PROD.ACT3, weight: 1.0 },
                { name: "Reaterro", order: _INTERNAL.PROD.ACT4, weight: 0.5 },
            ]
        },
        {
            name: "Montagem",
            order: _INTERNAL.PROD.CAT2,
            description: "Montagem das estruturas metálicas",
            activities: [
                { name: "Pré-Montagem", order: _INTERNAL.PROD.ACT1, weight: 1.0 },
                { name: "Içamento", order: _INTERNAL.PROD.ACT2, weight: 1.0 },
                { name: "Revisão", order: _INTERNAL.PROD.ACT3, weight: 0.5 },
                { name: "Torqueamento", order: _INTERNAL.PROD.ACT4, weight: 0.5 },
            ]
        },
        {
            name: "Cabos",
            aliases: ["Lançamento"],
            order: _INTERNAL.PROD.CAT3,
            description: "Lançamento e regulação de cabos condutores e para-raios",
            activities: [
                { name: "Lançamento Cabo Guia", order: _INTERNAL.PROD.ACT1, weight: 1.0 },
                { name: "Lançamento Condutor", order: _INTERNAL.PROD.ACT2, weight: 2.0 },
                { name: "Grampeação", order: _INTERNAL.PROD.ACT3, weight: 1.0 },
                { name: "Regulação", order: _INTERNAL.PROD.ACT4, weight: 1.0 },
            ]
        }
    ]
} as const;
