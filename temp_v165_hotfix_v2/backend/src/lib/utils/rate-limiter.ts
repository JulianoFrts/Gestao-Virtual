/**
 * Rate Limiter - GESTÃO VIRTUAL Backend
 *
 * Implementação in-memory.
 * Redis removido para simplificação de infraestrutura.
 */

// =============================================
// TIPOS
// =============================================

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

interface RateLimitConfig {
  /** Número máximo de requisições */
  maxRequests: number;
  /** Janela de tempo em milissegundos */
  windowMs: number;
  /** Duração do bloqueio em milissegundos */
  blockDurationMs: number;
}

interface RateLimitResult {
  /** Se a requisição deve ser bloqueada */
  blocked: boolean;
  /** Requisições restantes na janela */
  remaining: number;
  /** Timestamp de reset da janela */
  resetAt: number;
  /** Mensagem de erro (se bloqueado) */
  message?: string;
}

// =============================================
// CONFIGURAÇÃO
// =============================================

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: parseInt(process.env.API_RATE_LIMIT || "100", 10),
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || "60000", 10),
  blockDurationMs:
    process.env.NODE_ENV === "development" ? 10 * 1000 : 5 * 60 * 1000, // 10s em dev, 5min em prod
};

// =============================================
// ARMAZENAMENTO IN-MEMORY
// =============================================

const store = new Map<string, RateLimitEntry>();

let cleanupInterval: NodeJS.Timeout | undefined;

// Limpar entradas antigas periodicamente (a cada 5 minutos)
// Não iniciar automaticamente em ambiente de teste para evitar open handles
if (process.env.NODE_ENV !== "test" && typeof setInterval !== "undefined") {
  cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        // Remover entradas expiradas (janela + bloqueio)
        const expiryTime =
          entry.blockedUntil || entry.firstRequest + DEFAULT_CONFIG.windowMs;
        if (now > expiryTime) {
          store.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  );
}

export function stopCleanupInterval() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = undefined;
  }
}

// =============================================
// FUNÇÕES PRINCIPAIS
// =============================================

/**
 * Verifica e aplica rate limiting para um identificador
 * @param identifier IP ou outro identificador único
 * @param config Configuração customizada (opcional)
 * @returns Resultado do rate limiting
 */
export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {},
): RateLimitResult {
  const { maxRequests, windowMs, blockDurationMs } = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  const now = Date.now();

  // Validar identificador
  if (!identifier || typeof identifier !== "string") {
    return {
      blocked: false,
      remaining: maxRequests,
      resetAt: now + windowMs,
    };
  }

  // Normalizar identificador
  const normalizedId = identifier.trim().toLowerCase();

  // Buscar ou criar entrada
  let entry = store.get(normalizedId);

  // Se bloqueado, verificar se ainda está no período de bloqueio
  if (entry?.blocked && entry.blockedUntil) {
    const blockResult = handleBlockedEntry(entry, now, normalizedId);
    if (blockResult) return blockResult;
    // Se retornou null, o bloqueio expirou e entry foi resetada (undefined) inside helper?
    // No, helper cannot modify local 'entry' variable reference directly unless returning it or we reload it.
    // Better: handleBlockedEntry returns result OR "expired" signal.
    entry = store.get(normalizedId); // Refresh entry after potential delete
  }

  // Se não existe ou janela expirou, criar nova entrada
  if (!entry || now > entry.firstRequest + windowMs) {
    return createNewEntry(normalizedId, now, maxRequests, windowMs);
  }

  // Incrementar contador
  return incrementEntry(
    entry,
    normalizedId,
    maxRequests,
    blockDurationMs,
    windowMs,
    now,
  );
}

function handleBlockedEntry(
  entry: RateLimitEntry,
  now: number,
  normalizedId: string,
): RateLimitResult | null {
  if (now < entry.blockedUntil!) {
    const retryAfter = Math.ceil((entry.blockedUntil! - now) / 1000);
    return {
      blocked: true,
      remaining: 0,
      resetAt: entry.blockedUntil!,
      message: `Muitas requisições. Tente novamente em ${retryAfter} segundos.`,
    };
  }
  // Bloqueio expirou, resetar
  store.delete(normalizedId);
  return null;
}

function createNewEntry(
  normalizedId: string,
  now: number,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const entry = {
    count: 1,
    firstRequest: now,
    blocked: false,
  };
  store.set(normalizedId, entry);

  return {
    blocked: false,
    remaining: maxRequests - 1,
    resetAt: now + windowMs,
  };
}

function incrementEntry(
  entry: RateLimitEntry,
  normalizedId: string,
  maxRequests: number,
  blockDurationMs: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  entry.count++;

  // Verificar se excedeu limite
  if (entry.count > maxRequests) {
    entry.blocked = true;
    entry.blockedUntil = now + blockDurationMs;
    store.set(normalizedId, entry);

    const retryAfter = Math.ceil(blockDurationMs / 1000);
    return {
      blocked: true,
      remaining: 0,
      resetAt: entry.blockedUntil,
      message: `Limite de requisições excedido. Bloqueado por ${retryAfter} segundos.`,
    };
  }

  store.set(normalizedId, entry);

  return {
    blocked: false,
    remaining: maxRequests - entry.count,
    resetAt: entry.firstRequest + windowMs,
  };
}

/**
 * Verifica rate limit e retorna true se bloqueado (para uso no middleware)
 * @param identifier IP ou outro identificador
 * @returns true se a requisição deve ser bloqueada
 */
export async function isRateLimited(identifier: string): Promise<boolean> {
  const result = checkRateLimit(identifier);
  return result.blocked;
}

/**
 * Reseta o rate limit para um identificador
 * @param identifier IP ou outro identificador
 */
export function resetRateLimit(identifier: string): void {
  const normalizedId = identifier.trim().toLowerCase();
  store.delete(normalizedId);
}

/**
 * Obtém informações de rate limit sem incrementar contador
 * @param identifier IP ou outro identificador
 */
export function getRateLimitInfo(identifier: string): RateLimitResult | null {
  const normalizedId = identifier.trim().toLowerCase();
  const entry = store.get(normalizedId);

  if (!entry) {
    return null;
  }

  const now = Date.now();

  return {
    blocked:
      entry.blocked && entry.blockedUntil ? now < entry.blockedUntil : false,
    remaining: Math.max(0, DEFAULT_CONFIG.maxRequests - entry.count),
    resetAt: entry.blockedUntil || entry.firstRequest + DEFAULT_CONFIG.windowMs,
  };
}

/**
 * Limpa todo o store (útil para testes)
 */
export function clearRateLimitStore(): void {
  store.clear();
}

export default {
  checkRateLimit,
  isRateLimited,
  resetRateLimit,
  getRateLimitInfo,
  clearRateLimitStore,
};
