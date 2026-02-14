/**
 * Types de API - GESTÃO VIRTUAL Backend
 *
 * Define tipos padronizados para respostas e requisições da API
 */

import type { Role, AccountStatus } from "@prisma/client";

// =============================================
// TIPOS DE RESPOSTA
// =============================================

/**
 * Resposta padrão da API
 */
export interface ApiResponseBase {
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Resposta de sucesso com dados
 */
export interface ApiSuccessResponse<T = unknown> extends ApiResponseBase {
  success: true;
  data: T;
}

/**
 * Resposta de erro
 */
export interface ApiErrorResponse extends ApiResponseBase {
  success: false;
  errors?: string[];
  code?: string;
}

/**
 * União de respostas possíveis
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// =============================================
// TIPOS DE PAGINAÇÃO
// =============================================

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Metadados de paginação na resposta
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Resposta paginada
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// =============================================
// TIPOS DE USUÁRIO
// =============================================

/**
 * Usuário público (sem dados sensíveis)
 */
export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: AccountStatus;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/**
 * Dados para criar usuário
 */
export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role?: Role;
}

/**
 * Dados para atualizar usuário
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
  status?: AccountStatus;
}

// =============================================
// TIPOS DE HEALTH CHECK
// =============================================

/**
 * Status individual de um componente
 */
export interface ComponentHealth {
  status: "healthy" | "unhealthy" | "degraded";
  latency?: number;
  message?: string;
}

/**
 * Resposta completa do health check
 */
export interface HealthCheckResponse {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    database: ComponentHealth;
    memory: ComponentHealth;
    disk?: ComponentHealth;
  };
  details?: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    nodeVersion: string;
    platform: string;
  };
}

// =============================================
// TIPOS DE ERRO
// =============================================

/**
 * Códigos de erro padronizados
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "DATABASE_ERROR"
  | "INVALID_CREDENTIALS";

/**
 * Mapeamento de códigos para status HTTP
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  INVALID_CREDENTIALS: 401,
};
