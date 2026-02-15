import { db, CacheMetadata, CACHE_TTL, CacheableEntity } from './db';
import { storageService } from './storageService';

/**
 * CacheService - Serviço de cache estruturado com TTL
 * 
 * Gerencia cache de dados por entidade com:
 * - TTL (Time to Live) configurável por entidade
 * - Verificação automática de expiração
 * - Metadados de cache persistentes
 * - Invalidação por versão
 */
class CacheService {
    private cacheVersion = 1;

    /**
     * Gera a chave de cache para uma entidade
     */
    private getCacheKey(entity: CacheableEntity): string {
        return `cache:${entity}`;
    }

    /**
     * Salva dados no cache com TTL
     */
    async set<T>(entity: CacheableEntity, data: T[], customTtl?: number): Promise<void> {
        const key = this.getCacheKey(entity);
        const now = Date.now();
        const ttl = customTtl ?? CACHE_TTL[entity];

        try {
            // Salvar dados no storage usando a blindagem robusta do storageService
            // O storageService já cuida da limpeza de Proxies, Signals e DataCloneError
            await storageService.setItem(key, data);

            // Salvar metadados do cache
            const metadata: CacheMetadata = {
                key,
                tableName: entity,
                createdAt: now,
                expiresAt: now + ttl,
                recordCount: Array.isArray(data) ? data.length : 1,
                version: this.cacheVersion
            };

            await db.cacheKeys.put(metadata);

        } catch (error) {
            console.error(`[CacheService] Error caching ${entity}:`, error);
        }
    }

    /**
     * Recupera dados do cache se não expirado
     */
    async get<T>(entity: CacheableEntity): Promise<T[] | null> {
        const key = this.getCacheKey(entity);

        try {
            const metadata = await db.cacheKeys.get(key);

            // Verificar se cache existe e não expirou
            if (!metadata) {
                return null;
            }

            if (Date.now() > metadata.expiresAt) {
                await this.invalidate(entity);
                return null;
            }

            // Verificar versão do cache
            if (metadata.version !== this.cacheVersion) {
                await this.invalidate(entity);
                return null;
            }

            const cached = await db.storage.get(key);
            if (!cached) {
                return null;
            }

            return cached.value as T[];
        } catch (error) {
            console.error(`[CacheService] Error reading cache for ${entity}:`, error);
            return null;
        }
    }

    /**
     * Verifica se o cache é válido (existe e não expirou)
     */
    async isValid(entity: CacheableEntity): Promise<boolean> {
        const key = this.getCacheKey(entity);

        try {
            const metadata = await db.cacheKeys.get(key);

            if (!metadata) return false;
            if (Date.now() > metadata.expiresAt) return false;
            if (metadata.version !== this.cacheVersion) return false;

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Retorna metadados do cache de uma entidade
     */
    async getMetadata(entity: CacheableEntity): Promise<CacheMetadata | null> {
        const key = this.getCacheKey(entity);
        try {
            const metadata = await db.cacheKeys.get(key);
            return metadata ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Invalida o cache de uma ou mais entidades
     */
    async invalidate(...entities: CacheableEntity[]): Promise<void> {
        try {
            for (const entity of entities) {
                const key = this.getCacheKey(entity);
                await db.storage.delete(key);
                await db.cacheKeys.delete(key);
            }
        } catch (error) {
            console.error('[CacheService] Error invalidating cache:', error);
        }
    }

    /**
     * Invalida todos os caches expirados
     */
    async cleanExpired(): Promise<number> {
        try {
            const now = Date.now();
            const expired = await db.cacheKeys.where('expiresAt').below(now).toArray();

            for (const meta of expired) {
                await db.storage.delete(meta.key);
                await db.cacheKeys.delete(meta.key);
            }

            if (expired.length > 0) {
              // Cleaned expired cache entries - no additional action needed
            }

            return expired.length;
        } catch (error) {
            console.error('[CacheService] Error cleaning expired caches:', error);
            return 0;
        }
    }

    /**
     * Lista todos os caches ativos com status
     */
    async getStatus(): Promise<{
        entity: string;
        recordCount: number;
        expiresIn: number;
        isExpired: boolean;
    }[]> {
        try {
            const allMeta = await db.cacheKeys.toArray();
            const now = Date.now();

            return allMeta.map(meta => ({
                entity: meta.tableName,
                recordCount: meta.recordCount,
                expiresIn: Math.max(0, meta.expiresAt - now),
                isExpired: now > meta.expiresAt
            }));
        } catch {
            return [];
        }
    }

    /**
     * Limpa todo o cache
     */
    async clearAll(): Promise<void> {
        try {
            const allMeta = await db.cacheKeys.toArray();
            for (const meta of allMeta) {
                await db.storage.delete(meta.key);
            }
            await db.cacheKeys.clear();
        } catch (error) {
            console.error('[CacheService] Error clearing all caches:', error);
        }
    }

    /**
     * Incrementa a versão do cache para forçar refresh geral
     */
    incrementVersion(): void {
        this.cacheVersion++;
    }

    /**
     * Retorna tempo restante do cache em formato legível
     */
    async getTimeToLive(entity: CacheableEntity): Promise<string> {
        const metadata = await this.getMetadata(entity);
        if (!metadata) return 'Cache não existe';

        const remaining = metadata.expiresAt - Date.now();
        if (remaining <= 0) return 'Expirado';

        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}

export const cacheService = new CacheService();
