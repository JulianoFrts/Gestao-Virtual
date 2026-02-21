import React from "react";
import { authRoutes } from "./modules/auth.routes";
import { adminRoutes } from "./modules/admin.routes";
import { operationsRoutes } from "./modules/operations.routes";
import { coreRoutes } from "./modules/core.routes";
import { advancedRoutes } from "./modules/advanced.routes";

/**
 * Interface de configuração de rotas do sistema.
 * Define metadados para navegação, controle de acesso e layout.
 */
export interface RouteConfig {
  path: string;
  element: React.ComponentType<any> | React.ReactNode;
  moduleId?: string;
  roles?: string[];
  requireConnection?: boolean;
  layout?: "app" | "fullscreen" | "desktop" | "none";
  label?: string;
  icon?: React.ElementType;
}

/**
 * Centralização de todas as rotas do ecossistema.
 * Agrupa definições modularizadas por contexto de negócio.
 */
export const routes: RouteConfig[] = [
  ...authRoutes,
  ...coreRoutes,
  ...operationsRoutes,
  ...adminRoutes,
  ...advancedRoutes,
];

// Re-exportação para facilitar consumo por componentes de navegação
export { authRoutes, adminRoutes, operationsRoutes, coreRoutes, advancedRoutes };
