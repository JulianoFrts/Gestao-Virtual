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
