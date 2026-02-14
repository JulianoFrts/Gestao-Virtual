import { useCallback, useState } from 'react';
import { db } from '@/integrations/database';
import { cacheService } from '@/services/cacheService';
import { CacheableEntity } from '@/services/db';

interface CacheWarmingStatus {
    isWarming: boolean;
    progress: number;
    currentEntity: string | null;
    completedEntities: CacheableEntity[];
    errors: { entity: string; error: string }[];
}

/**
 * useCacheWarming - Hook para pré-carregar dados essenciais no cache
 * 
 * Uso após login para garantir funcionamento offline:
 * - Carrega dados de referência (funcionários, equipes, funções, etc.)
 * - Executa em background sem bloquear a UX
 * - Resiliência a erros parciais
 */
export function useCacheWarming() {
    const [status, setStatus] = useState<CacheWarmingStatus>({
        isWarming: false,
        progress: 0,
        currentEntity: null,
        completedEntities: [],
        errors: [],
    });

    /**
     * Lista de entidades a cachear na ordem de prioridade
     */
    const entitiesToCache: {
        entity: CacheableEntity;
        query: () => Promise<any>;
    }[] = [
            {
                entity: 'jobFunctions',
                query: async () => {
                    const { data, error } = await db
                        .from('job_functions')
                        .select('*')
                        .order('name');
                    if (error) throw error;
                    return data;
                },
            },
            {
                entity: 'companies',
                query: async () => {
                    const { data, error } = await (db as any)
                        .from('companies')
                        .select('*')
                        .order('name');
                    if (error) throw error;
                    return data;
                },
            },
            {
                entity: 'projects',
                query: async () => {
                    const { data, error } = await (db as any)
                        .from('projects')
                        .select('*')
                        .order('name');
                    if (error) throw error;
                    return data;
                },
            },
            {
                entity: 'sites',
                query: async () => {
                    const { data, error } = await (db as any)
                        .from('sites')
                        .select('*')
                        .order('name');
                    if (error) throw error;
                    return data;
                },
            },
            {
                entity: 'teams',
                query: async () => {
                    const { data, error } = await db
                        .from('teams')
                        .select(`
            *,
            supervisor:users!teams_supervisor_id_fkey(id, name)
          `)
                        .eq('is_active', true)
                        .order('name');
                    if (error) throw error;
                    return data;
                },
            },
            {
                entity: 'employees',
                query: async () => {
                    const { data, error } = await db
                        .from('users')
                        .select(`
            *,
            jobFunction:job_functions(id, name, can_lead_team)
          `)
                        .eq('status', 'ACTIVE')
                        .order('name');
                    if (error) throw error;
                    return data;
                },
            },
            {
                entity: 'constructionDocuments',
                query: async () => {
                    const { data, error } = await db
                        .from('construction_documents' as any)
                        .select('*')
                        .order('created_at', { ascending: false });
                    if (error) throw error;
                    return data;
                },
            },
            {
                entity: 'mapElements',
                query: async () => {
                    const { data, error } = await db
                        .from('map_elements' as any)
                        .select('*');
                    if (error) throw error;
                    return data;
                },
            },
            {
                entity: 'towerTechnicalData',
                query: async () => {
                    const { data, error } = await db
                        .from('tower_technical_data' as any)
                        .select('*');
                    if (error) throw error;
                    return data;
                },
            },
        ];

    /**
     * Executa o warming do cache
     * @param force - Se true, força recarga mesmo com cache válido
     */
    const warmCache = useCallback(async (force: boolean = false) => {
        if (status.isWarming) {
            return;
        }


        setStatus({
            isWarming: true,
            progress: 0,
            currentEntity: null,
            completedEntities: [],
            errors: [],
        });

        const completed: CacheableEntity[] = [];
        const errors: { entity: string; error: string }[] = [];

        for (let i = 0; i < entitiesToCache.length; i++) {
            const { entity, query } = entitiesToCache[i];

            setStatus(prev => ({
                ...prev,
                currentEntity: entity,
                progress: (i / entitiesToCache.length) * 100,
            }));

            try {
                // Verificar se cache já é válido (a menos que force=true)
                if (!force && await cacheService.isValid(entity)) {
                    completed.push(entity);
                    continue;
                }

                // Buscar dados e cachear
                const data = await query();
                await cacheService.set(entity, data);
                completed.push(entity);

            } catch (error: any) {
                console.error(`[CacheWarming] Error caching ${entity}:`, error);
                errors.push({ entity, error: error.message || 'Unknown error' });
            }
        }

        setStatus({
            isWarming: false,
            progress: 100,
            currentEntity: null,
            completedEntities: completed,
            errors,
        });

        // Limpar caches expirados
        await cacheService.cleanExpired();

    }, [status.isWarming]);

    /**
     * Verifica status de todos os caches
     */
    const getCacheStatus = useCallback(async () => {
        return await cacheService.getStatus();
    }, []);

    /**
     * Invalida todos os caches (útil para logout)
     */
    const clearAllCaches = useCallback(async () => {
        await cacheService.clearAll();
        setStatus({
            isWarming: false,
            progress: 0,
            currentEntity: null,
            completedEntities: [],
            errors: [],
        });
    }, []);

    return {
        warmCache,
        getCacheStatus,
        clearAllCaches,
        status,
        isWarming: status.isWarming,
    };
}


