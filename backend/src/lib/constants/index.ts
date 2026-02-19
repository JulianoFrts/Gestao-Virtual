/**
 * Constantes Globais - GESTÃO VIRTUAL
 * Ponto de entrada único para todas as configurações, limites e metadados do sistema.
 */

/**
 * Constantes de API e Infraestrutura
 */
export const API = {
  VERSION: "v1",
  PREFIX: "/api/v1",
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    DEFAULT_PAGE_SIZE: 20,
  },
  BATCH: {
    SIZE: 500,
    LARGE: 10000,
    EXTREME: 50000,
  },
  STREAM: {
    THRESHOLD: 2000,
  },
  THROTTLE: {
    THRESHOLD: 5000,
    MS: 50,
  },
  TIMEOUTS: {
    DEFAULT: 30000,
    EXTENDED: 60000,
    REORDER_COOLDOWN: 500,
  },
  CACHE: {
    TTL_SHORT: 60,
    TTL_LONG: 3600,
    TTL_EXTREME: 31536000, // 1 ano
  },
  LOGGING: {
    STACK_TRACE_LIMIT: 5,
    MAX_LOG_SNAPSHOT: 500,
  }
} as const;

/**
 * Constantes de Autenticação e Segurança
 */
export const AUTH = {
  SESSION: {
    MAX_AGE: 30 * 24 * 60 * 60, // 30 dias
  },
  MFA: {
    TIME_STEP: 30,
    WINDOW: 1,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    BCRYPT_ROUNDS: 12,
    MIN_STRENGTH: 3,
  },
  LIMITS: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINS: 15,
    PREVIEW_LENGTH: 3,
  },
  TOKENS: {
    SHORT_LENGTH: 6,
    DEFAULT_LENGTH: 8,
    EMAIL_VERIFICATION_EXPIRES: 24 * 60 * 60 * 1000,
    PASSWORD_RESET_EXPIRES: 60 * 60 * 1000,
  }
} as const;

/**
 * Constantes de Validação de Dados
 */
export const VALIDATION = {
  STRING: {
    MAX_NAME: 255,
    MAX_SHORT_TEXT: 255,
    MAX_DESCRIPTION: 1000,
    MAX_PATH: 512,
    MAX_METADATA: 5000,
    MIN_NAME: 2,
    MIN_EMAIL: 5,
  },
  DOCUMENTS: {
    CPF_LENGTH: 11,
    CNPJ_LENGTH: 14,
    ZIP_CODE_LENGTH: 8,
  },
  CONTACT: {
    PHONE_LENGTH: 11,
  },
  FILE: {
    MAX_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  }
} as const;

/**
 * Constantes de HTTP (Status e Mensagens)
 */
export const HTTP = {
  STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    PRECONDITION_FAILED: 412,
    UNPROCESSABLE: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
  MESSAGES: {
    SUCCESS: {
      CREATED: "Criado com sucesso",
      UPDATED: "Atualizado com sucesso",
      DELETED: "Removido com sucesso",
      LOGIN: "Login realizado com sucesso",
      LOGOUT: "Logout realizado com sucesso",
    },
    ERROR: {
      INTERNAL: "Erro interno do servidor",
      UNAUTHORIZED: "Não autenticado",
      FORBIDDEN: "Sem permissão para esta ação",
      NOT_FOUND: "Recurso não encontrado",
      VALIDATION: "Erro de validação",
      CONFLICT: "Conflito com recurso existente",
      RATE_LIMITED: "Muitas requisições. Tente novamente mais tarde.",
      INVALID_CREDENTIALS: "Email ou senha incorretos",
    }
  }
} as const;

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

export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  NAME: /^[a-zA-ZÀ-ÿ\s'-]+$/,
  CUID: /^c[a-z0-9]+$/,
} as const;

export const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
} as const;

/**
 * Constantes de Auditoria e Governança
 */
export const AUDIT = {
  SEVERITY: {
    CRITICAL: "CRITICAL",
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
  },
  WEIGHTS: {
    CRITICAL: 3,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 0,
  }
} as const;

/**
 * Constantes de Tempo e Calendário
 */
export const TIME = {
  END_OF_DAY: {
    HOURS: 23,
    MINUTES: 59,
    SECONDS: 59,
    MS: 999,
  },
  MS_IN_SECOND: 1000,
  SECONDS_IN_MINUTE: 60,
  MINUTES_IN_HOUR: 60,
  HOURS_IN_DAY: 24,
  SECONDS_IN_DAY: 86400,
  MS_IN_HOUR: 3600000,
  MS_IN_DAY: 86400000,
} as const;

/**
 * Objeto Central de acesso (Namespace Style)
 */
export const CONSTANTS = {
  API,
  AUTH,
  VALIDATION,
  HTTP,
  ROLE_LEVELS,
  ACCOUNT_STATUS,
  AUDIT,
  TIME,
  REGEX,
} as const;

/**
 * Retrocompatibilidade e Atalhos Gerais
 */
export const HTTP_STATUS = HTTP.STATUS;
export const MESSAGES = HTTP.MESSAGES;
export const BATCH_SIZE = API.BATCH.SIZE;
export const DEFAULT_PAGE = API.PAGINATION.DEFAULT_PAGE;
export const DEFAULT_LIMIT = API.PAGINATION.DEFAULT_LIMIT;

// Atalhos para retrocompatibilidade
export const BCRYPT_ROUNDS = AUTH.PASSWORD.BCRYPT_ROUNDS;
export const SESSION_MAX_AGE = AUTH.SESSION.MAX_AGE;
export const MFA_TIME_STEP = AUTH.MFA.TIME_STEP;
export const MFA_WINDOW = AUTH.MFA.WINDOW;
