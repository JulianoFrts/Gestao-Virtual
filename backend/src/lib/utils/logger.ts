/**
 * Logger Estruturado - GESTÃO VIRTUAL Backend
 *
 * Sistema de logging com níveis, contexto e formatação consistente
 */

// =============================================
// TIPOS
// =============================================

type LogLevel = "debug" | "info" | "warn" | "error" | "test" | "success";

interface LogContext {
  source?: string; // Path format like "src/modules/Feature/infrastructure"
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  test: 1,
  success: 2,
  info: 3,
  warn: 4,
  error: 5,
};

const CURRENT_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "development" ? "debug" : "info");

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// =============================================
// FORMATADORES
// =============================================

/**
 * Formata timestamp no padrão yyyy/mm/dd-HH:mm/SS
 */
function getCustomTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  return `${y}/${m}/${d}-${h}:${min}/${s}`;
}

/**
 * Formata entrada de log para console seguindo o padrão solicitado
 * Formato: Log.[Level]: yyyy/mm/dd-HH:mm/SS][source]: [UserID] > {Message}
 */
function formatForConsole(
  level: LogLevel,
  message: string,
  timestamp: string,
  context?: LogContext,
  error?: any,
): string {
  const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    orange: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
  };

  const { colorCode, levelLabel } = getColorForLevel(level, colors);
  return buildLogOutput(
    levelLabel,
    colorCode,
    message,
    timestamp,
    colors,
    context,
    error,
  );
}

function getColorForLevel(
  level: LogLevel,
  colors: any,
): { colorCode: string; levelLabel: string } {
  let colorCode = "";
  let levelLabel = "";
  switch (level) {
    case "error":
      colorCode = colors.red;
      levelLabel = "Error";
      break;
    case "warn":
      colorCode = colors.orange;
      levelLabel = "Warn";
      break;
    case "info":
      colorCode = colors.blue;
      levelLabel = "Info";
      break;
    case "success":
      colorCode = colors.green;
      levelLabel = "Success";
      break;
    case "debug":
      colorCode = colors.cyan;
      levelLabel = "Debug";
      break;
    case "test":
      colorCode = colors.white;
      levelLabel = "Test";
      break;
    default:
      colorCode = colors.reset;
      levelLabel = level;
  }
  return { colorCode, levelLabel };
}

function buildLogOutput(
  levelLabel: string,
  colorCode: string,
  message: string,
  timestamp: string,
  colors: any,
  context?: LogContext,
  error?: any,
): string {
  const source = context?.source ? `${context.source}` : "src";
  const userId = context?.userId ? `[${context.userId}] ` : "";

  const header = `${colorCode}Log.${levelLabel}: ${timestamp}]${colors.reset}`;
  const path = `${colors.gray}${source}:${colors.reset}`;
  const body = ` ${userId}> ${colorCode}${message}${colors.reset}`;

  let output = `${header}${path}${body}`;

  if (context?.violation) {
    output += `\n${colors.red}  [VIOLAÇÃO]: ${context.violation}${colors.reset}`;
  }

  if (context?.suggestion) {
    output += `\n${colors.green}  [SUGESTÃO]: ${context.suggestion}${colors.reset}`;
  }

  if (error) {
    output += `\n${colors.red}  Error: ${error.name}: ${error.message}${colors.reset}`;
    if (!IS_PRODUCTION && error.stack) {
      output += `\n  ${error.stack}`;
    }
  }

  return output;
}

// =============================================
// LOGGER PRINCIPAL
// =============================================

/**
 * Logger interno
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LEVEL]) return;

  let error: any;
  let cleanContext: LogContext | undefined;

  if (context) {
    const { error: contextError, ...rest } = context;
    error = contextError;
    cleanContext = Object.keys(rest).length > 0 ? rest : undefined;
  }

  const timestamp = getCustomTimestamp();
  const formatted = formatForConsole(
    level,
    message,
    timestamp,
    cleanContext,
    error,
  );

  console.log(formatted);
}

// =============================================
// API PÚBLICA
// =============================================

export const logger = {
  /**
   * Log de debug (desenvolvimento)
   */
  debug(message: string, context?: LogContext): void {
    log("debug", message, context);
  },

  /**
   * Log informativo
   */
  info(message: string, context?: LogContext): void {
    log("info", message, context);
  },

  /**
   * Log de aviso
   */
  warn(message: string, context?: LogContext): void {
    log("warn", message, context);
  },

  /**
   * Log de erro (vermelho)
   */
  error(message: string, context?: LogContext): void {
    log("error", message, context);
  },

  /**
   * Log de teste (branco)
   */
  test(message: string, context?: LogContext): void {
    log("test", message, context);
  },

  /**
   * Log de sucesso (verde)
   */
  success(message: string, context?: LogContext): void {
    log("success", message, context);
  },

  /**
   * Log de requisição HTTP
   */
  request(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext,
  ): void {
    const level: LogLevel =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    log(level, `${method} ${path} ${statusCode} ${durationMs}ms`, context);
  },

  /**
   * Cria logger com contexto fixo
   */
  child(defaultContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        log("debug", message, { ...defaultContext, ...context }),
      test: (message: string, context?: LogContext) =>
        log("test", message, { ...defaultContext, ...context }),
      success: (message: string, context?: LogContext) =>
        log("success", message, { ...defaultContext, ...context }),
      info: (message: string, context?: LogContext) =>
        log("info", message, { ...defaultContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        log("warn", message, { ...defaultContext, ...context }),
      error: (message: string, context?: LogContext) =>
        log("error", message, { ...defaultContext, ...context }),
    };
  },
};

export default logger;
