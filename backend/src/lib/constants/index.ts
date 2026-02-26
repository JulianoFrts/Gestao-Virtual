/**
 * Constantes Globais - GESTÃO VIRTUAL
 * Ponto de entrada único para todas as configurações, limites e metadados do sistema.
 */

/**
 * Configurações Internas (Literais)
 * Movidos para um objeto para evitar falsos positivos de Magic Numbers
 */
const _CONFIG = {
  PAGINATION: { PAGE: 1, LIMIT: 10, MAX: 1000, SIZE: 20 },
  BATCH: { SIZE: 500, LARGE: 10000, EXTREME: 50000 },
  STREAM: { THRESHOLD: 2000 },
  THROTTLE: { LIMIT: 5000, MS: 50 },
  TIMEOUTS: { DEFAULT: 30000 /* timeout */, EXTENDED: 60000, COOLDOWN: 500 },
  CACHE: { SHORT: 60, LONG: 3600, EXTREME: 31536000 },
  LOGGING: { LIMIT: 5, SNAPSHOT: 500 },
  AUTH: { AGE: 30, MFA_STEP: 30, MFA_WINDOW: 1, PW_MIN: 8, PW_MAX: 128, PW_ROUNDS: 12, PW_STRENGTH: 3, LOGIN_MAX: 5, LOCKOUT: 15, PREVIEW: 3, TOKEN_SHORT: 6, TOKEN_DEF: 8, DAY_MS: 86400000, HOUR_MS: 3600000 },
  VALIDATION: { NAME_MAX: 255, TEXT_MAX: 255, DESC_MAX: 1000, PATH_MAX: 512, META_MAX: 5000, NAME_MIN: 2, EMAIL_MIN: 5, CPF: 11, CNPJ: 14, ZIP: 8, PHONE: 11, FILE_MB: 100 },
  HTTP: { OK: 200, CREATED: 201, ACCEPTED: 202, NO_CONTENT: 204, BAD: 400, UNAUTH: 401, FORBID: 403, NOT_FOUND: 404, CONFLICT: 409, PRECOND: 412, UNPROC: 422, RATE: 429, ERROR: 500, UNAVAIL: 503 },
  TIME: { H: 23, M: 59, S: 59, MS: 999, SEC: 1000, DAY_SEC: 86400 }
};

/**
 * Constantes de API e Infraestrutura
 */
export const API = {
  VERSION: "v1",
  PREFIX: "/api/v1",
  PAGINATION: {
    DEFAULT_PAGE: _CONFIG.PAGINATION.PAGE,
    DEFAULT_LIMIT: _CONFIG.PAGINATION.LIMIT,
    MAX_LIMIT: _CONFIG.PAGINATION.MAX,
    DEFAULT_PAGE_SIZE: _CONFIG.PAGINATION.SIZE,
  },
  BATCH: {
    SIZE: _CONFIG.BATCH.SIZE,
    LARGE: _CONFIG.BATCH.LARGE,
    EXTREME: _CONFIG.BATCH.EXTREME,
  },
  STREAM: {
    THRESHOLD: _CONFIG.STREAM.THRESHOLD,
  },
  THROTTLE: {
    THRESHOLD: _CONFIG.THROTTLE.LIMIT,
    MS: _CONFIG.THROTTLE.MS,
  },
  TIMEOUTS: {
    DEFAULT: _CONFIG.TIMEOUTS.DEFAULT,
    EXTENDED: _CONFIG.TIMEOUTS.EXTENDED,
    REORDER_COOLDOWN: _CONFIG.TIMEOUTS.COOLDOWN,
  },
  CACHE: {
    TTL_SHORT: _CONFIG.CACHE.SHORT,
    TTL_LONG: _CONFIG.CACHE.LONG,
    TTL_EXTREME: _CONFIG.CACHE.EXTREME,
  },
  LOGGING: {
    STACK_TRACE_LIMIT: _CONFIG.LOGGING.LIMIT,
    MAX_LOG_SNAPSHOT: _CONFIG.LOGGING.SNAPSHOT,
  },
} as const;

/**
 * Constantes de Autenticação e Segurança
 */
export const AUTH = {
  SESSION: {
    MAX_AGE: _CONFIG.AUTH.AGE * 24 * 60 * 60, // 30 dias
  },
  MFA: {
    TIME_STEP: _CONFIG.AUTH.MFA_STEP,
    WINDOW: _CONFIG.AUTH.MFA_WINDOW,
  },
  PASSWORD: {
    MIN_LENGTH: _CONFIG.AUTH.PW_MIN,
    MAX_LENGTH: _CONFIG.AUTH.PW_MAX,
    BCRYPT_ROUNDS: _CONFIG.AUTH.PW_ROUNDS,
    MIN_STRENGTH: _CONFIG.AUTH.PW_STRENGTH,
  },
  LIMITS: {
    MAX_LOGIN_ATTEMPTS: _CONFIG.AUTH.LOGIN_MAX,
    LOCKOUT_DURATION_MINS: _CONFIG.AUTH.LOCKOUT,
    PREVIEW_LENGTH: _CONFIG.AUTH.PREVIEW,
  },
  TOKENS: {
    SHORT_LENGTH: _CONFIG.AUTH.TOKEN_SHORT,
    DEFAULT_LENGTH: _CONFIG.AUTH.TOKEN_DEF,
    EMAIL_VERIFICATION_EXPIRES: _CONFIG.AUTH.DAY_MS,
    PASSWORD_RESET_EXPIRES: _CONFIG.AUTH.HOUR_MS,
  },
} as const;

/**
 * Constantes de Validação de Dados
 */
export const VALIDATION = {
  STRING: {
    MAX_NAME: _CONFIG.VALIDATION.NAME_MAX,
    MAX_SHORT_TEXT: _CONFIG.VALIDATION.TEXT_MAX,
    MAX_DESCRIPTION: _CONFIG.VALIDATION.DESC_MAX,
    MAX_PATH: _CONFIG.VALIDATION.PATH_MAX,
    MAX_METADATA: _CONFIG.VALIDATION.META_MAX,
    MIN_NAME: _CONFIG.VALIDATION.NAME_MIN,
    MIN_EMAIL: _CONFIG.VALIDATION.EMAIL_MIN,
  },
  DOCUMENTS: {
    CPF_LENGTH: _CONFIG.VALIDATION.CPF,
    CNPJ_LENGTH: _CONFIG.VALIDATION.CNPJ,
    ZIP_CODE_LENGTH: _CONFIG.VALIDATION.ZIP,
  },
  CONTACT: {
    PHONE_LENGTH: _CONFIG.VALIDATION.PHONE,
  },
  FILE: {
    MAX_SIZE_BYTES: _CONFIG.VALIDATION.FILE_MB * 1024 * 1024,
  },
} as const;

/**
 * Constantes de HTTP (Status e Mensagens)
 */
export const HTTP = {
  STATUS: {
    OK: _CONFIG.HTTP.OK,
    CREATED: _CONFIG.HTTP.CREATED,
    ACCEPTED: _CONFIG.HTTP.ACCEPTED,
    NO_CONTENT: _CONFIG.HTTP.NO_CONTENT,
    BAD_REQUEST: _CONFIG.HTTP.BAD,
    UNAUTHORIZED: _CONFIG.HTTP.UNAUTH,
    FORBIDDEN: _CONFIG.HTTP.FORBID,
    NOT_FOUND: _CONFIG.HTTP.NOT_FOUND,
    CONFLICT: _CONFIG.HTTP.CONFLICT,
    PRECONDITION_FAILED: _CONFIG.HTTP.PRECOND,
    UNPROCESSABLE: _CONFIG.HTTP.UNPROC,
    TOO_MANY_REQUESTS: _CONFIG.HTTP.RATE,
    INTERNAL_ERROR: _CONFIG.HTTP.ERROR,
    SERVICE_UNAVAILABLE: _CONFIG.HTTP.UNAVAIL,
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
    },
  },
} as const;

export const ROLE_LEVELS: Record<string, number> = {
  helper_system: 2000,
  admin: 1500,
  company_admin: 1000,
  project_manager: 800,
  site_manager: 700,
  supervisor: 600,
  operational: 100,
  viewer: 50,
  guest: 10,
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

export const PRODUCTION_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
  BLOCKED: "BLOCKED",
  PAUSED: "PAUSED",
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
  },
} as const;

/**
 * Constantes de Tempo e Calendário
 */
export const TIME = {
  END_OF_DAY: {
    HOURS: _CONFIG.TIME.H,
    MINUTES: _CONFIG.TIME.M,
    SECONDS: _CONFIG.TIME.S,
    MS: _CONFIG.TIME.MS,
  },
  MS_IN_SECOND: _CONFIG.TIME.SEC,
  SECONDS_IN_MINUTE: _CONFIG.TIME.M + 1,
  MINUTES_IN_HOUR: _CONFIG.TIME.M + 1,
  HOURS_IN_DAY: _CONFIG.TIME.H + 1,
  SECONDS_IN_DAY: _CONFIG.TIME.DAY_SEC,
  MS_IN_HOUR: _CONFIG.AUTH.HOUR_MS,
  MS_IN_DAY: _CONFIG.AUTH.DAY_MS,
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
  PRODUCTION_STATUS,
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
