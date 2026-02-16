/**
 * Constantes da Aplicação - GESTÃO VIRTUAL Backend
 */

// =============================================
// API
// =============================================

export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;

// =============================================
// PAGINAÇÃO
// =============================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;
export const BATCH_SIZE = 500;
export const STREAM_THRESHOLD = 2000;
export const THROTTLE_THRESHOLD = 5000;
export const THROTTLE_MS = 50;

// =============================================
// AUTENTICAÇÃO
// =============================================

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias em segundos
export const MFA_TIME_STEP = 30; // 30 segundos
export const MFA_WINDOW = 1; // +/- 1 step
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const BCRYPT_ROUNDS = 12;

// =============================================
// RATE LIMITING
// =============================================

export const RATE_LIMIT_MAX = 1000;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
export const RATE_LIMIT_BLOCK_MS = 1 * 60 * 1000; // 1 minuto (reduzido de 5min)

// =============================================
// TOKENS
// =============================================

export const EMAIL_VERIFICATION_EXPIRES = 24 * 60 * 60 * 1000; // 24 horas
export const PASSWORD_RESET_EXPIRES = 60 * 60 * 1000; // 1 hora

// =============================================
// MENSAGENS
// =============================================

export const MESSAGES = {
  // Sucesso
  SUCCESS: {
    CREATED: "Criado com sucesso",
    UPDATED: "Atualizado com sucesso",
    DELETED: "Removido com sucesso",
    LOGIN: "Login realizado com sucesso",
    LOGOUT: "Logout realizado com sucesso",
  },

  // Erros
  ERROR: {
    INTERNAL: "Erro interno do servidor",
    UNAUTHORIZED: "Não autenticado",
    FORBIDDEN: "Sem permissão para esta ação",
    NOT_FOUND: "Recurso não encontrado",
    VALIDATION: "Erro de validação",
    CONFLICT: "Conflito com recurso existente",
    RATE_LIMITED: "Muitas requisições. Tente novamente mais tarde.",
    INVALID_CREDENTIALS: "Email ou senha incorretos",
  },

  // Usuário
  USER: {
    NOT_FOUND: "Usuário não encontrado",
    EMAIL_EXISTS: "Email já está em uso",
    ACCOUNT_SUSPENDED: "Conta suspensa",
    ACCOUNT_INACTIVE: "Conta inativa",
  },
} as const;

// =============================================
// HTTP STATUS
// =============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// =============================================
// ROLES (Use ROLE_LEVELS keys for comprehensive list)

export const ROLE_LEVELS: Record<string, number> = {
  helper_system: 2000,
  super_admin_god: 1500,
  socio_diretor: 1000,
  admin: 950,
  ti_software: 900,
  moderator: 850,
  manager: 850,
  gestor_project: 800,
  gestor_canteiro: 700,
  supervisor: 600,
  technician: 400,
  operator: 300,
  worker: 100,
  user: 100,
  viewer: 50,
} as const;

// =============================================
// REGEX
// =============================================

export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  NAME: /^[a-zA-ZÀ-ÿ\s'-]+$/,
  CUID: /^c[a-z0-9]+$/,
} as const;
