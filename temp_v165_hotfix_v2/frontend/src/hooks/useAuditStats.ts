import { useState, useEffect, useCallback } from 'react';
import { orionApi } from '@/integrations/orion/client';

export function useAuditStats() {
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    const loadStats = useCallback(async () => {
        setIsLoading(true);
        try {
            if (navigator.onLine) {
                // Busca logs com status PENDING da rota especializada
                const response = await orionApi.get<any[]>('/production/logs', {
                    pendingOnly: 'true'
                });

                if (response.error) throw new Error(response.error.message);
                setPendingCount(response.data?.length || 0);
            }
        } catch (error) {
            console.error('Error loading audit stats:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
        // Polling facultativo para manter o dashboard atualizado (ex: a cada 1 minuto)
        const interval = setInterval(loadStats, 60000);
        return () => clearInterval(interval);
    }, [loadStats]);

    return {
        pendingCount,
        isLoading,
        refresh: loadStats
    };
}
