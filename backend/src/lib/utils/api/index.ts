/**
 * API Index - Exportações centralizadas
 *
 * Este arquivo organiza as exportações dos utilitários da API
 */

// Respostas padronizadas
export { ApiResponse, handleApiError } from "./response";

// Erros customizados
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from "./error";
