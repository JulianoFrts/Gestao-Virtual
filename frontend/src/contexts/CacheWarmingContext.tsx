import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCacheWarming } from '@/hooks/useCacheWarming';
import { cacheService } from '@/services/cacheService';
import logger from '@/lib/logger';

interface CacheWarmingContextType {
    warmCache: (force?: boolean) => Promise<void>;
    getCacheStatus: () => Promise<any[]>;
    clearAllCaches: () => Promise<void>;
    isWarming: boolean;
}

const CacheWarmingContext = createContext<CacheWarmingContextType | undefined>(undefined);

/**
 * CacheWarmingProvider - Gerencia cache warming automático após login
 * 
 * Este provider deve ser usado DENTRO do AuthProvider para ter acesso ao contexto de auth.
 * Automaticamente inicia o cache warming quando detecta um login bem-sucedido.
 */
export default function CacheWarmingProvider({ children }: { children: ReactNode }) {
    const { user, profile, isLoading } = useAuth();
    const { warmCache, getCacheStatus, clearAllCaches, isWarming } = useCacheWarming();

    // Refs para controle estável (evita re-renders disparando múltiplas vezes)
    const hasWarmedRef = useRef(false);
    const lastUserIdRef = useRef<string | null>(null);

    // Executar cache warming quando usuário faz login (apenas uma vez por sessão)
    useEffect(() => {
        // Aguardar carregamento inicial
        if (isLoading) return;

        // Se tem usuário e perfil
        if (user && profile) {
            // Verificar se já fez warming para este usuário
            if (hasWarmedRef.current && lastUserIdRef.current === user.id) {
                return; // Já executou para este usuário
            }

            hasWarmedRef.current = true;
            lastUserIdRef.current = user.id;

            // Executar de forma assíncrona sem bloquear
            warmCache(false).catch(err => {
                logger.error(err?.message || 'Cache warming error', 'CacheWarmingProvider', err);
            });
        } else {
            // Resetar flags quando não há usuário
            hasWarmedRef.current = false;
            lastUserIdRef.current = null;
        }
    }, [user?.id, profile?.id, isLoading]); // Dependências estáveis

    // Limpar caches quando usuário faz logout
    useEffect(() => {
        if (!isLoading && !user) {
            cacheService.clearAll();
        }
    }, [user, isLoading]);

    // Limpar caches expirados periodicamente (a cada 5 minutos)
    useEffect(() => {
        const interval = setInterval(() => {
            cacheService.cleanExpired();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <CacheWarmingContext.Provider value={{
            warmCache,
            getCacheStatus,
            clearAllCaches,
            isWarming,
        }}>
            {children}
        </CacheWarmingContext.Provider>
    );
}

/**
 * Hook para acessar o contexto de cache warming
 */
export function useCacheWarmingContext() {
    const context = useContext(CacheWarmingContext);
    if (context === undefined) {
        throw new Error('useCacheWarmingContext must be used within a CacheWarmingProvider');
    }
    return context;
}
