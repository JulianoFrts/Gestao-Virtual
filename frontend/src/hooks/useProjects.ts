import { useEffect, useCallback } from 'react';
import { projects as projectsSignal, fetchGlobalData, Project } from '@/signals/globalDataSignals';
import { isLoadingDataSignal } from '@/signals/syncSignals';
import { useToast } from '@/hooks/use-toast';
import { orionApi } from '@/integrations/orion/client';

export type { Project };

export function useProjects(companyId?: string) {
    const { toast } = useToast();

    const loadProjects = useCallback(async () => {
        await fetchGlobalData();
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const createProject = async (data: Partial<Project>) => {
        const { data: created, error } = await orionApi.post<Project>('projects', data);
        if (error) {
            toast({ title: 'Erro ao criar obra', description: error.message, variant: 'destructive' });
            return null;
        }
        await fetchGlobalData();
        toast({ title: 'Obra criada com sucesso' });
        return created;
    };

    const updateProject = async (id: string, data: Partial<Project>) => {
        const { error } = await orionApi.put(`projects/${id}`, data);
        if (error) {
            toast({ title: 'Erro ao atualizar obra', description: error.message, variant: 'destructive' });
            return false;
        }
        await fetchGlobalData();
        toast({ title: 'Obra atualizada com sucesso' });
        return true;
    };

    const deleteProject = async (id: string) => {
        const { error } = await orionApi.delete(`projects/${id}`);
        if (error) {
            toast({ title: 'Erro ao excluir obra', description: error.message, variant: 'destructive' });
            return false;
        }
        await fetchGlobalData();
        toast({ title: 'Obra excluída com sucesso' });
        return true;
    };

    return {
        projects: projectsSignal.value,
        isLoading: isLoadingDataSignal.value,
        createProject,
        updateProject,
        deleteProject,
        refresh: fetchGlobalData
    };
}
