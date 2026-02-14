import { useState, useCallback } from 'react';
import { orionApi } from '@/integrations/orion/client';
import { TowerProductionData } from '@/modules/production/types';

export function useTowerProduction() {
    const [towersByStage, setTowersByStage] = useState<Record<string, TowerProductionData[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const loadProductionData = useCallback(async (
        stages: { id: string, name: string, productionActivityId?: string | null }[], 
        projectId?: string, 
        siteId?: string, 
        companyId?: string
    ) => {
        if (!projectId || !companyId || stages.length === 0) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (projectId && projectId !== 'all') params.append('projectId', projectId);
            if (siteId && siteId !== 'all') params.append('siteId', siteId);
            params.append('companyId', companyId);

            const response = await orionApi.get(`/production/tower-status?${params.toString()}`);
            if (response.error) {
                console.error('[useTowerProduction] API Error:', response.error);
                throw new Error(response.error.message);
            }
            const towers = (response.data as TowerProductionData[]) || [];
            
            const result: Record<string, TowerProductionData[]> = {};
            stages.forEach(stage => {
                const activityId = stage.productionActivityId || stage.id;
                const finishedTowers = towers.filter(tower => {
                    const statuses = tower.activityStatuses || [];
                    return statuses.some(s => {
                        const matchById = s.activityId === activityId || 
                            s.activity?.id === activityId || 
                            s.activity?.productionActivityId === activityId;
                        
                        const activityName = (s.activity?.name || '').trim().toLowerCase();
                        const stageName = (stage.name || '').trim().toLowerCase();
                        const matchByName = stageName && activityName && activityName.includes(stageName);

                        const statusStr = (s.status as string) || '';
                        const isFinished = statusStr === 'FINISHED' || statusStr === 'COMPLETED' || (s.progressPercent || 0) >= 100;
                        
                        return (matchById || matchByName) && isFinished;
                    });
                });
                result[stage.id] = finishedTowers;
            });

            setTowersByStage(result);
            setHasLoaded(true);
            return result;
        } catch (error) {
            console.error('[useTowerProduction] Erro ao carregar dados:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setTowersByStage({});
        setHasLoaded(false);
    }, []);

    return {
        towersByStage,
        isLoading,
        hasLoaded,
        loadProductionData,
        reset
    };
}
