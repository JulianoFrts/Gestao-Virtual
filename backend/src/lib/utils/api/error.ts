/**
 * Classes de Erro Customizadas - GESTÃO VIRTUAL Backend
 */

import type { ErrorCode } from "@/types/api";
import { HTTP_STATUS } from "@/lib/constants";

/**
 * Erro base da aplicação
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly errors?: string[];

  constructor(
    message: string,
    code: ErrorCode = "INTERNAL_ERROR",
    statusCode?: number,
    errors?: string[],
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.errors = errors;

    // Mapear código para status HTTP
    this.statusCode = statusCode ?? this.getStatusFromCode(code);

    // Manter stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  private getStatusFromCode(code: ErrorCode): number {
    const statusMap: Record<ErrorCode, number> = {
      VALIDATION_ERROR: HTTP_STATUS.BAD_REQUEST,
      UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
      FORBIDDEN: HTTP_STATUS.FORBIDDEN,
      NOT_FOUND: HTTP_STATUS.NOT_FOUND,
      CONFLICT: HTTP_STATUS.CONFLICT,
      RATE_LIMITED: HTTP_STATUS.TOO_MANY_REQUESTS,
      INTERNAL_ERROR: HTTP_STATUS.INTERNAL_ERROR,
      DATABASE_ERROR: HTTP_STATUS.INTERNAL_ERROR,
      SERVICE_UNAVAILABLE: HTTP_STATUS.SERVICE_UNAVAILABLE,
      INVALID_CREDENTIALS: HTTP_STATUS.UNAUTHORIZED,
    };
    return statusMap[code] || HTTP_STATUS.INTERNAL_ERROR;
  }
}

/**
 * Erro de validação
 */
export class ValidationError extends AppError {
  constructor(errors: string[]) {
    super("Erro de validação", "VALIDATION_ERROR", HTTP_STATUS.BAD_REQUEST, errors);
    this.name = "ValidationError";
  }
}

/**
 * Erro de autenticação
 */
export class AuthenticationError extends AppError {
  constructor(message = "Não autenticado") {
    super(message, "UNAUTHORIZED", HTTP_STATUS.UNAUTHORIZED);
    this.name = "AuthenticationError";
  }
}

/**
 * Erro de autorização
 */
export class AuthorizationError extends AppError {
  constructor(message = "Sem permissão para esta ação") {
    super(message, "FORBIDDEN", HTTP_STATUS.FORBIDDEN);
    this.name = "AuthorizationError";
  }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super(`${resource} não encontrado`, "NOT_FOUND", HTTP_STATUS.NOT_FOUND);
    this.name = "NotFoundError";
  }
}

/**
 * Erro de conflito
 */
export class ConflictError extends AppError {
  constructor(message = "Conflito com recurso existente") {
    super(message, "CONFLICT", HTTP_STATUS.CONFLICT);
    this.name = "ConflictError";
  }
}

/**
 * Erro de rate limit
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message = "Muitas requisições", retryAfter?: number) {
    super(message, "RATE_LIMITED", HTTP_STATUS.TOO_MANY_REQUESTS);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Erro de banco de dados
 */
export class DatabaseError extends AppError {
  constructor(message = "Erro no banco de dados") {
    super(message, "DATABASE_ERROR", HTTP_STATUS.INTERNAL_ERROR);
    this.name = "DatabaseError";
  }
}

/**
 * Verifica se é um erro da aplicação
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export default AppError;
