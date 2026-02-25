import { useCallback } from 'react';
import { orionApi } from '@/integrations/orion/client';
import { storageService } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import { generateId, safeDate } from '@/lib/utils';
import {
  timeRecords as recordsSignal,
  isLoadingRecords,
  fetchTimeRecords,
  hasTimeRecordsFetchedSignal,
  type TimeRecord
} from '@/signals/timeSignals';

export function useTimeRecords() {
  const { toast } = useToast();

  const saveToStorage = async (recordsToSave: TimeRecord[]) => {
    await storageService.setItem('timeRecords', recordsToSave);
  };

  const loadRecords = useCallback(async () => {
    await fetchTimeRecords(true);
  }, []);

  const createRecord = async (data: {
    employeeId: string;
    teamId?: string;
    companyId?: string;
    recordType: 'entry' | 'exit';
    photoUrl?: string;
    latitude?: number;
    longitude?: number;
    recordedAt?: Date;
  }) => {
    const localId = generateId();

    // Session check for createdBy
    let userId = null;
    try {
      const session = await orionApi.auth.getSession();
      userId = session.data.session?.user?.id || null;
    } catch (e) {
      console.warn('Network auth check failed');
    }

    if (!userId) {
       // Deep fallback for worker sessions
       const manualSession = await storageService.getItem('manual_worker_session');
       if (manualSession) {
          // Worker session doesn't use the standard user ID in createdBy usually
       }
    }

    const manualSession = await storageService.getItem('manual_worker_session');
    const isManualWorker = !!manualSession;
    const effectiveUserId = isManualWorker ? null : userId;

    const newRecord: TimeRecord = {
      id: localId,
      employeeId: data.employeeId,
      userId: data.employeeId,
      teamId: data.teamId || null,
      companyId: data.companyId || null,
      recordType: data.recordType,
      type: data.recordType === 'entry' ? 'IN' : 'OUT',
      photoUrl: data.photoUrl || null,
      location: data.latitude ? `${data.latitude},${data.longitude}` : 'N/A',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      recordedAt: data.recordedAt || new Date(),
      createdBy: effectiveUserId,
      syncedAt: null,
      localId,
    };

    const isOnline = navigator.onLine;

    // Signal update (optimistic)
    recordsSignal.value = [newRecord, ...recordsSignal.value];
    await saveToStorage(recordsSignal.value);

    if (isOnline) {
      try {
        const { data: created, error } = await orionApi
          .from('time_records')
          .insert({
            userId: data.employeeId,
            teamId: data.teamId || null,
            companyId: data.companyId || null,
            recordType: data.recordType,
            photoUrl: data.photoUrl || null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            recordedAt: (newRecord.recordedAt instanceof Date ? newRecord.recordedAt : new Date(newRecord.recordedAt)).toISOString(),
            localId: localId,
          })
          .single();

        if (error) throw error;

        const updatedRecord = {
          ...newRecord,
          id: created.id,
          employeeName: created.user?.name,
          syncedAt: new Date(), // Set as synced
        };

        recordsSignal.value = recordsSignal.value.map(r => r.localId === localId ? updatedRecord : r);
        await saveToStorage(recordsSignal.value);

        return { success: true, data: updatedRecord };
      } catch (error: any) {
        console.warn('Online sync failed, falling back to offline mode.', error);
        await storageService.addToSyncQueue({
          operation: 'insert',
          table: 'time_records',
          data: { ...data, localId, recordedAt: (newRecord.recordedAt instanceof Date ? newRecord.recordedAt : new Date(newRecord.recordedAt)).toISOString() },
        });

        toast({
          title: 'Salvo offline',
          description: 'Registro salvo no dispositivo. Será sincronizado quando houver conexão.',
        });

        return { success: true, data: newRecord, offline: true };
      }
    } else {
      await storageService.addToSyncQueue({
        operation: 'insert',
        table: 'time_records',
        data: { ...data, localId, recordedAt: (newRecord.recordedAt instanceof Date ? newRecord.recordedAt : new Date(newRecord.recordedAt)).toISOString() },
      });

      toast({
        title: 'Modo Offline',
        description: 'Registro salvo localmente.',
      });

      return { success: true, data: newRecord, offline: true };
    }
  };

  const updateRecord = async (id: string, data: Partial<TimeRecord>) => {
    try {
      const { error } = await orionApi
        .from('time_records')
        .update({
          ...data,
          id // Ensure ID is passed for the update routing
        });

      if (error) throw error;

      const updatedRecords = recordsSignal.value.map(r => r.id === id ? { ...r, ...data } : r);
      recordsSignal.value = updatedRecords;
      await saveToStorage(updatedRecords);

      return { success: true };
    } catch (error: any) {
      console.warn('Online update failed, falling back to offline mode.');
      const updatedRecords = recordsSignal.value.map(r => r.id === id ? { ...r, ...data } : r);
      recordsSignal.value = updatedRecords;
      await saveToStorage(updatedRecords);

      await storageService.addToSyncQueue({
        operation: 'update',
        table: 'time_records',
        itemId: id,
        data: data,
      });

      toast({
        title: 'Atualização offline',
        description: 'As alterações foram salvas localmente.',
      });

      return { success: true, offline: true };
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await orionApi
        .from('time_records')
        .eq('id', id)
        .delete();

      if (error) throw error;

      const updatedRecords = recordsSignal.value.filter(r => r.id !== id);
      recordsSignal.value = updatedRecords;
      await saveToStorage(updatedRecords);

      return { success: true };
    } catch (error: any) {
      console.warn('Online delete failed, falling back to offline mode.');
      const updatedRecords = recordsSignal.value.filter(r => r.id !== id);
      recordsSignal.value = updatedRecords;
      await saveToStorage(updatedRecords);

      await storageService.addToSyncQueue({
        operation: 'delete',
        table: 'time_records',
        itemId: id,
      });

      toast({
        title: 'Exclusão offline',
        description: 'O registro foi removido localmente.',
      });

      return { success: true, offline: true };
    }
  };

  const bulkUpdateRecords = async (ids: string[], data: Partial<TimeRecord>) => {
    try {
      // orionApi.from().update doesn't natively support bulk by IDs in a single call with standard SDK syntax 
      // without extra backend support or manual loop. For now, doing sequential or custom RPC if available.
      // But based on project standards, we usually use orionApi.put directly or bulk endpoint.
      
      const results = await Promise.all(ids.map(id => updateRecord(id, data)));
      const hasError = results.some(r => !r.success);
      
      return { success: !hasError };
    } catch (error: any) {
      console.error('Error in bulk update:', error);
      return { success: false, error: error.message };
    }
  };

  const bulkDeleteRecords = async (ids: string[]) => {
    try {
      const results = await Promise.all(ids.map(id => deleteRecord(id)));
      const hasError = results.some(r => !r.success);
      
      return { success: !hasError };
    } catch (error: any) {
      console.error('Error in bulk delete:', error);
      return { success: false, error: error.message };
    }
  };

  const getTodayRecords = () => {
    const today = new Date().toDateString();
    return recordsSignal.value.filter(r => safeDate(r.recordedAt)?.toDateString() === today);
  };

  // Initial fetch
  if (recordsSignal.value.length === 0 && !isLoadingRecords.value && !hasTimeRecordsFetchedSignal.value) {
    fetchTimeRecords().catch(console.error);
  }

  return {
    records: recordsSignal.value,
    isLoading: isLoadingRecords.value,
    createRecord,
    updateRecord,
    bulkUpdateRecords,
    bulkDeleteRecords,
    deleteRecord,
    getTodayRecords,
    refresh: loadRecords,
  };
}
