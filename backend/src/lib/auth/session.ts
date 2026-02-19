/**
 * Utilitários de Sessão - GESTÃO VIRTUAL Backend
 * Este arquivo atua como o ponto de entrada principal para autenticação e sessões,
 * delegando lógica para módulos especializados para manter SRP e evitar dependências circulares.
 */

export * from "./core";
export * from "./permissions";
export * from "./validators";
export * from "./utils";
