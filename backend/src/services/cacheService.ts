/**
 * Cache Service - GESTÃO VIRTUAL Backend
 * 
 * Implementação de Cache In-Memory (Substituindo Redis)
 * Armazena dados na memória RAM do servidor.
 */

import { logger } from "@/lib/utils/logger";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    logger.info("[CACHE] In-Memory Cache Initialized");
    
    // Limpeza automática de chaves expiradas a cada 60 segundos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Remove itens expirados do cache
   */
  private cleanup() {
    const now = Date.now();
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

      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      return entry.value as T;
    } catch (error) {
      logger.error("[CACHE] Get Error", { key, error });
      return null;
    }
  }

  /**
   * Define um valor no cache com expiração (TTL em segundos)
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttlSeconds * 1000);
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
      const prefix = pattern.replace('*', '');
      
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(k => this.cache.delete(k));
      
      if (keysToDelete.length > 0) {
         logger.debug(`[CACHE] Deleted ${keysToDelete.length} keys matching pattern '${pattern}'`);
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

export const cacheService = new CacheService();
export default cacheService;
