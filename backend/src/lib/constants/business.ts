
/**
 * Constantes de Regras de Negócio
 * Definições de hierarquia de cargos, categorias de produção e pesos.
 */

// Hierarquia de Cargos (Menor número = Maior hierarquia organizacional)
// Diferente de ROLE_LEVELS onde maior número = maior permissão de sistema.
export const JOB_HIERARCHY = {
    MANAGER: 1,      // Project Manager, Site Manager, Residente
    COORDINATOR: 2,  // Coordenador, Supervisor
    ENGINEER: 3,     // Engenheiro
    LEADER: 4,       // Encarregado, Líder
    TECHNICIAN: 5,   // Técnico, Topógrafo
    OPERATOR: 6,     // Motorista, Operador
    SKILLED: 8,      // Pedreiro, Carpinteiro, Armador
    DEFAULT: 10,     // Geral
    HELPER: 11,      // Ajudante, Servente
} as const;

export const PASSWORD_HASHES = {
    // Hash para senha padrão '123456' ou similar usada em seeds
    DEFAULT_SEED: "$2b$10$EpWa/z.6q.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1",
} as const;

export const PRODUCTION_CONFIG = {
    CATEGORIES: [
        {
            name: "Fundação",
            order: 10,
            description: "Etapa de escavação e concretagem das bases",
            activities: [
                { name: "Escavação", order: 1, weight: 1.0 },
                { name: "Armação", order: 2, weight: 1.0 },
                { name: "Concretagem", order: 3, weight: 1.0 },
                { name: "Reaterro", order: 4, weight: 0.5 },
            ]
        },
        {
            name: "Montagem",
            order: 20,
            description: "Montagem das estruturas metálicas",
            activities: [
                { name: "Pré-Montagem", order: 1, weight: 1.0 },
                { name: "Içamento", order: 2, weight: 1.0 },
                { name: "Revisão", order: 3, weight: 0.5 },
                { name: "Torqueamento", order: 4, weight: 0.5 },
            ]
        },
        {
            name: "Cabos", // Alias: Lançamento
            aliases: ["Lançamento"],
            order: 30,
            description: "Lançamento e regulação de cabos condutores e para-raios",
            activities: [
                { name: "Lançamento Cabo Guia", order: 1, weight: 1.0 },
                { name: "Lançamento Condutor", order: 2, weight: 2.0 },
                { name: "Grampeação", order: 3, weight: 1.0 },
                { name: "Regulação", order: 4, weight: 1.0 },
            ]
        }
    ]
} as const;
