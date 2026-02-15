/**
 * Lib Index - Exportações centralizadas
 *
 * Facilita imports no projeto
 */

// Prisma
export { prisma } from "./prisma/client";

// Auth
export { default as authConfig } from "./auth/config";
export { auth } from "./auth/auth";
export {
  getCurrentSession,
  requireAuth,
  requireAdmin,
  requireRole,
} from "./auth/session";

// Utils
export { ApiResponse, handleApiError } from "./utils/api/response";
export { logger } from "./utils/logger";
export { checkRateLimit } from "./utils/rate-limiter";

// Constants
export * from "./constants";
