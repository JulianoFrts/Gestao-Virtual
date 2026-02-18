import { useCallback } from 'react';
import { orionApi } from '@/integrations/orion/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cacheService } from '@/services/cacheService';

export function useTowerTechnicalData(selectedProjectId: string) {
    const { profile } = useAuth();
    const { toast } = useToast();

    const updateTowerTechnicalProperty = useCallback(async (objectId: string, property: string, value: any) => {
        if (!profile?.id || selectedProjectId === 'all') return;

        try {
            const dataUpdate: any = {
                projectId: selectedProjectId,
                companyId: profile.companyId,
                externalId: objectId,
                elementType: 'TOWER',
                [property]: value
            };

            const { error } = await orionApi
                .from('map_elements')
                .upsert([dataUpdate], {
                    onConflict: 'projectId, externalId'
                });



            if (error) throw error;

            await cacheService.invalidate('towerTechnicalData');
            return true;
        } catch (err: any) {
            console.error(`Error updating tower ${property}:`, err);
            toast({
                title: "Erro ao salvar dado técnico",
                description: err.message,
                variant: "destructive"
            });
            return false;
        }
    }, [profile, selectedProjectId, toast]);

    const wipeAllProjectData = useCallback(async () => {
        if (!selectedProjectId || selectedProjectId === 'all') return;

        try {
            const { error } = await orionApi
                .from('map_elements')
                .delete()
                .eq('projectId', selectedProjectId)
                .eq('type', 'TOWER'); // No frontend o parâmetro é 'type', no backend vira 'elementType' via filtros no builder ou direto na rota

            if (error) throw error;

            await cacheService.invalidate('towerTechnicalData');
            toast({ title: "Dados removidos", description: "Todos os dados técnicos das torres deste projeto foram excluídos." });
            return true;
        } catch (err: any) {
            console.error('Error wiping data:', err);
            toast({ title: "Erro ao remover dados", description: err.message, variant: "destructive" });
            return false;
        }
    }, [selectedProjectId, toast]);

    return {
        updateTowerTechnicalProperty,
        wipeAllProjectData
    };
}
