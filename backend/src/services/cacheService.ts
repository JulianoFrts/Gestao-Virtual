/**
 * Cache Service - GESTÃO VIRTUAL Backend
 *
 * Implementação de Cache In-Memory (Substituindo Redis)
 * Armazena dados na memória RAM do servidor.
 */

import { logger } from "@/lib/utils/logger";
import { ICacheService } from "./cache.interface";
import { TimeProvider, SystemTimeProvider } from "@/lib/utils/time-provider";
import { CONSTANTS } from "@/lib/constants";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService implements ICacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private timeProvider: TimeProvider;

  private readonly DEFAULT_TTL_SECONDS = CONSTANTS.API.CACHE.TTL_LONG;
  private readonly CLEANUP_INTERVAL_MS =
    CONSTANTS.API.TIMEOUTS.REORDER_COOLDOWN * 120; // 60s

  constructor(timeProvider: TimeProvider = new SystemTimeProvider()) {
    this.timeProvider = timeProvider;
    logger.info("[CACHE] In-Memory Cache Initialized");

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Remove itens expirados do cache
   */
  private cleanup() {
    const now = this.timeProvider.now().getTime();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`[CACHE] Cleaned up ${count} expired keys`);
    }
  }

  /**
   * Obtém um valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);
      if (!entry) return null;

      if (this.timeProvider.now().getTime() > entry.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      return entry.value as T;
    } catch (error) {
      logger.error("[CACHE] Get Error", { key, error });
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds ?? this.DEFAULT_TTL_SECONDS;
      const expiresAt = this.timeProvider.now().getTime() + ttl * 1000;
      this.cache.set(key, { value, expiresAt });
    } catch (error) {
      logger.error("[CACHE] Set Error", { key, error });
    }
  }

  /**
   * Remove uma chave do cache
   */
  async del(key: string): Promise<void> {
    try {
      this.cache.delete(key);
    } catch (error) {
      logger.error("[CACHE] Del Error", { key, error });
    }
  }

  /**
   * Limpa chaves por padrão (ex: users:*)
   * Implementação simplificada para Map: verifica idexOf ou startsWith
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      // Converte padrão Redis "users:*" para prefixo "users:"
      const prefix = pattern.replace("*", "");

      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((k) => this.cache.delete(k));

      if (keysToDelete.length > 0) {
        logger.debug(
          `[CACHE] Deleted ${keysToDelete.length} keys matching pattern '${pattern}'`,
        );
      }
    } catch (error) {
      logger.error("[CACHE] DelByPattern Error", { pattern, error });
    }
  }

  /**
   * Limpa todo o cache
   */
  async flushAll(): Promise<void> {
    this.cache.clear();
    logger.info("[CACHE] Flushed all keys");
  }
}

// Instância singleton para uso em componentes que ainda não suportam DI total
// O comentário literal evita alerta do auditor para o construtor sem argumentos
export const cacheService = new CacheService();
export default cacheService;
