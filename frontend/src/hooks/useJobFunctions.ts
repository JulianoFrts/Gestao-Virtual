import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/integrations/database';
import { storageService } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { mapDatabaseError, logError } from '@/lib/errorHandler';

export interface JobFunction {
  id: string;
  companyId: string | null;
  name: string;
  description: string | null;
  canLeadTeam: boolean;
  hierarchyLevel: number;
  laborType: string | null;
  createdAt: Date;
  company?: { id: string; name: string } | null;
}

export function useJobFunctions() {
  const [functions, setFunctions] = useState<JobFunction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const hasInitialFetched = useRef(false);

  const loadFunctions = useCallback(async (force = false) => {
    if ((isLoading || hasInitialFetched.current) && !force) return;

    setIsLoading(true);
    hasInitialFetched.current = true;
    try {
      if (navigator.onLine) {
        const { data, error } = await db
          .from('job_functions')
          .select('*')
          .order('level', { ascending: false })
          .order('name');

        if (error) throw error;

        const mapped = (data || []).map(f => ({
          id: f.id,
          companyId: f.companyId || f.company_id,
          name: f.name,
          description: f.description,
          canLeadTeam: f.canLeadTeam || f.can_lead_team || false,
          hierarchyLevel: f.hierarchyLevel || f.level || f.hierarchy_level || 0,
          laborType: f.laborType || f.labor_type || 'MOD',
          createdAt: new Date(f.created_at || f.createdAt || Date.now()),
          company: f.company,
        }));

        setFunctions(mapped);
        storageService.setItem('functions', mapped);
      } else {
        const cached = await storageService.getItem<JobFunction[]>('functions') || [];
        setFunctions(cached);
      }
    } catch (error) {
      console.error('Error loading functions:', error);
      const cached = await storageService.getItem<JobFunction[]>('functions') || [];
      setFunctions(cached);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    loadFunctions();
  }, [loadFunctions]);

  const createFunction = async (data: { name: string; description: string; canLeadTeam: boolean; hierarchyLevel?: number; laborType: string;  companyId?: string | null }) => {
    const localId = generateId();
    const newFunc: JobFunction = {
      id: localId,
      companyId: (data as any).companyId || null,
      name: data.name,
      description: data.description || null,
      canLeadTeam: data.canLeadTeam,
      hierarchyLevel: data.hierarchyLevel || 0,
      laborType: data.laborType,
      createdAt: new Date(),
    };

    // Optimistic update
    setFunctions(prev => [...prev, newFunc]);
    storageService.setItem('functions', [...functions, newFunc]);

    if (navigator.onLine) {
      try {
        const { data: created, error } = await db
          .from('job_functions')
          .insert({
            name: data.name,
            description: data.description || null,
            canLeadTeam: data.canLeadTeam,
            hierarchyLevel: data.hierarchyLevel || 0,
            laborType: data.laborType,
            companyId: (data as any).companyId || null,
          })
          .select()
          .single();

        if (error) throw error;

        const updatedFunc = {
          ...newFunc,
          id: created.id,
        };

        setFunctions(prev => prev.map(f => f.id === localId ? updatedFunc : f));
        storageService.setItem('functions', functions.map(f => f.id === localId ? updatedFunc : f));

        return { success: true, data: updatedFunc };
      } catch (error: any) {
        logError('Function Create', error);
        const userMessage = mapDatabaseError(error);
        toast({
          title: 'Erro ao criar função',
          description: userMessage,
          variant: 'destructive',
        });
        setFunctions(prev => prev.filter(f => f.id !== localId));
        return { success: false, error: userMessage };
      }
    } else {
      storageService.addToSyncQueue({
        operation: 'insert',
        table: 'job_functions',
        data: { ...data, localId },
      });
      return { success: true, data: newFunc, offline: true };
    }
  };

  const updateFunction = async (id: string, data: { name: string; description: string; canLeadTeam: boolean; hierarchyLevel?: number; laborType?: string; companyId?: string | null }) => {
    const oldFunctions = [...functions];

    setFunctions(prev => prev.map(f =>
      f.id === id ? { ...f, name: data.name, description: data.description, canLeadTeam: data.canLeadTeam, hierarchyLevel: data.hierarchyLevel ?? f.hierarchyLevel, laborType: data.laborType ?? f.laborType } : f
    ));

    if (navigator.onLine) {
      try {
        const { error } = await db
          .from('job_functions')
          .update({
            name: data.name,
            description: data.description || null,
            canLeadTeam: data.canLeadTeam,
            hierarchyLevel: data.hierarchyLevel ?? 0,
            laborType: data.laborType,
          })
          .eq('id', id);

        if (error) throw error;

        storageService.setItem('functions', functions.map(f =>
          f.id === id ? { ...f, ...data } : f
        ));

        return { success: true };
      } catch (error: any) {
        logError('Function Update', error);
        setFunctions(oldFunctions);
        const userMessage = mapDatabaseError(error);
        toast({
          title: 'Erro ao atualizar função',
          description: userMessage,
          variant: 'destructive',
        });
        return { success: false, error: userMessage };
      }
    } else {
      storageService.addToSyncQueue({
        operation: 'update',
        table: 'job_functions',
        id,
        data,
      });
      storageService.setItem('functions', functions);
      return { success: true, offline: true };
    }
  };

  const deleteFunction = async (id: string) => {
    const oldFunctions = [...functions];
    setFunctions(prev => prev.filter(f => f.id !== id));

    if (navigator.onLine) {
      try {
        const { error } = await db
          .from('job_functions')
          .delete()
          .eq('id', id);

        if (error) throw error;

        storageService.setItem('functions', functions.filter(f => f.id !== id));
        return { success: true };
      } catch (error: any) {
        logError('Function Delete', error);
        setFunctions(oldFunctions);
        const userMessage = mapDatabaseError(error);
        toast({
          title: 'Erro ao remover função',
          description: userMessage,
          variant: 'destructive',
        });
        return { success: false, error: userMessage };
      }
    } else {
      storageService.addToSyncQueue({
        operation: 'delete',
        table: 'job_functions',
        id,
      });
      storageService.setItem('functions', functions.filter(f => f.id !== id));
      return { success: true, offline: true };
    }
  };

  return {
    functions,
    isLoading,
    createFunction,
    updateFunction,
    deleteFunction,
    refresh: loadFunctions,
  };
}
