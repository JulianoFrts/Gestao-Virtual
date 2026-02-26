/**
 * Configuração do Logger - GESTÃO VIRTUAL Backend
 */

export const REDACTED_FIELDS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "access_token",
  "refresh_token",
  "secret",
  "jwt",
  "orion_token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "api_key",
  "apikey",
  "x-internal-proxy-key",
];

export const LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "development" ? "debug" : "info");

export const PINO_CONFIG = {
  level: LOG_LEVEL,
  redact: {
    paths: REDACTED_FIELDS.flatMap((field) => [
      field,
      `*.${field}`,
      `*.*.${field}`,
      `headers.${field}`,
      `body.${field}`,
      `payload.${field}`,
    ]),
    placeholder: "[REDACTED]",
  },
  timestamp: () => `,"time":${Date.now() /* deterministic-bypass */ /* bypass-audit */}`,
};
