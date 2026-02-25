import pino from "pino";
import { PINO_CONFIG } from "./logger.config";

/**
 * Logger Estruturado - GESTÃO VIRTUAL Backend
 *
 * Baseado em Pino para alta performance e segurança (redação de dados sensíveis).
 * Otimizado para Next.js: Saída JSON pura via stdout para compatibilidade com Edge e Node.js.
 * Formatação (Pretty) é delegada ao terminal via CLI em modo desenvolvimento.
 */

const pinoInstance = pino(PINO_CONFIG);

// Cores ANSI para o terminal
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
};

// =============================================
// API PÚBLICA (Compatibilidade)
// =============================================

export const logger = {
  debug(message: string, context?: any): void {
    pinoInstance.debug(context || {}, message);
  },

  info(message: string, context?: any): void {
    pinoInstance.info(context || {}, message);
  },

  warn(message: string, context?: any): void {
    pinoInstance.warn(context || {}, message);
  },

  error(message: string, context?: any): void {
    if (context?.error instanceof Error) {
      pinoInstance.error(context.error, message);
    } else {
      pinoInstance.error(context || {}, message);
    }
  },

  /**
   * Log de sucesso (verde no dev)
   */
  success(message: string, context?: any): void {
    pinoInstance.info({ ...context, logType: "success" }, `✅ ${message}`);
  },

  /**
   * Log de teste (branco no dev)
   */
  test(message: string, context?: any): void {
    pinoInstance.info({ ...context, logType: "test" }, `🧪 ${message}`);
  },

  /**
   * Log de requisição HTTP
   */
  request(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: any,
  ): void {
    const level =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    pinoInstance[level](
      {
        ...context,
        method,
        path,
        statusCode,
        durationMs,
      },
      `HTTP ${method} ${path} ${statusCode} (${durationMs}ms)`,
    );
  },

  /**
   * Log Padronizado [BACKEND] Status(code) [Method] Path
   */
  standard(
    statusCode: number,
    method: string,
    path: string,
    error?: any,
    source?: string,
  ): void {
    let color = COLORS.white;
    if (statusCode >= 500) color = COLORS.red;
    else if (statusCode >= 400) color = COLORS.yellow;
    else if (statusCode >= 300) color = COLORS.cyan;
    else if (statusCode >= 200) color = COLORS.green;

    const statusText = `${color}Status(${statusCode})${COLORS.reset}`;
    const methodText =
      method !== "N/A" ? `${COLORS.bold}[${method}]${COLORS.reset} ` : "";
    const pathText = path !== "N/A" ? path : "";

    let logMessage = `${statusText} ${methodText}${pathText}`;

    if (error) {
      const errorDetail =
        error instanceof Error ? error.message : String(error);
      const sourceDetail = source
        ? ` at ${COLORS.bold}${source}${COLORS.reset}`
        : "";
      logMessage += ` | ${COLORS.bgRed}${COLORS.white}${COLORS.bold} ERROR ${COLORS.reset} ${COLORS.red}${errorDetail}${sourceDetail}${COLORS.reset}`;
    }

    // Usar o console.log diretamente para garantir que as cores apareçam sem interferência do pino-pretty em alguns ambientes
    // Mas também logar no pino para persistência/auditoria estruturada
    if (process.env.NODE_ENV === "development") {
      console.log(logMessage);
    } else {
      pinoInstance.info(
        { statusCode, method, path, source, error },
        logMessage,
      );
    }
  },

  /**
   * Cria logger com contexto fixo
   */
  child(defaultContext: any) {
    const childPino = pinoInstance.child(defaultContext);
    return {
      debug: (message: string, context?: any) =>
        childPino.debug(context || {}, message),
      info: (message: string, context?: any) =>
        childPino.info(context || {}, message),
      warn: (message: string, context?: any) =>
        childPino.warn(context || {}, message),
      error: (message: string, context?: any) =>
        childPino.error(context || {}, message),
      success: (message: string, context?: any) =>
        childPino.info({ ...context, logType: "success" }, `✅ ${message}`),
      test: (message: string, context?: any) =>
        childPino.info({ ...context, logType: "test" }, `🧪 ${message}`),
    };
  },
};

export default logger;
