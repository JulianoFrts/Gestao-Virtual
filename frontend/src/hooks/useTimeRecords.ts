import { useCallback } from 'react';
import { db } from '@/integrations/database';
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

    // Auth check that works offline
    let userId = null;
    try {
      const session = await db.auth.getSession();
      userId = session.data.session?.user?.id || null;
    } catch (e) {
      console.warn('Network auth check failed, using local fallback');
    }

    if (!userId) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (parsed.user?.id) {
                userId = parsed.user.id;
                break;
              }
            }
          } catch (e) {
            // ignore
          }
        }
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

    // Actualiza signal optimista
    recordsSignal.value = [newRecord, ...recordsSignal.value];
    await saveToStorage(recordsSignal.value);

    if (isOnline) {
      try {
        const { data: created, error } = await db
          .from('time_records')
          .insert({
            user_id: data.employeeId,
            team_id: data.teamId || null,
            company_id: data.companyId || null,
            record_type: data.recordType,
            photo_url: data.photoUrl || null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            recorded_at: (newRecord.recordedAt instanceof Date ? newRecord.recordedAt : new Date(newRecord.recordedAt)).toISOString(),
            created_by: effectiveUserId,
            synced_at: new Date().toISOString(),
            local_id: localId,
          })
          .select(`*, user:users!time_records_user_id_fkey(name)`)
          .single();

        if (error) throw error;

        const updatedRecord = {
          ...newRecord,
          id: created.id,
          employeeName: created.user?.name,
          syncedAt: new Date(created.synced_at || new Date()),
        };

        recordsSignal.value = recordsSignal.value.map(r => r.localId === localId ? updatedRecord : r);
        await saveToStorage(recordsSignal.value);

        return { success: true, data: updatedRecord };
      } catch (error: any) {
        console.warn('Online sync failed, falling back to offline mode.');
        await storageService.addToSyncQueue({
          operation: 'insert',
          table: 'time_records',
          data: { ...data, localId, recordedAt: (newRecord.recordedAt instanceof Date ? newRecord.recordedAt : new Date(newRecord.recordedAt)).toISOString(), createdBy: effectiveUserId },
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
        data: { ...data, localId, recordedAt: (newRecord.recordedAt instanceof Date ? newRecord.recordedAt : new Date(newRecord.recordedAt)).toISOString(), createdBy: effectiveUserId },
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
      const { error } = await db
        .from('time_records')
        .update({
          user_id: data.employeeId,
          team_id: data.teamId,
          record_type: data.recordType,
          photo_url: data.photoUrl,
          recorded_at: data.recordedAt ? (data.recordedAt instanceof Date ? data.recordedAt : new Date(data.recordedAt)).toISOString() : undefined,
          latitude: data.latitude,
          longitude: data.longitude,
        })
        .eq('id', id);

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
      const { error } = await db
        .from('time_records')
        .delete()
        .eq('id', id);

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
      const updatePayload: any = {};
      if (data.photoUrl === null) updatePayload.photo_url = null;
      if (data.latitude === null) updatePayload.latitude = null;
      if (data.longitude === null) updatePayload.longitude = null;
      if (data.recordType) updatePayload.record_type = data.recordType;

      const { error } = await db
        .from('time_records')
        .update(updatePayload)
        .in('id', ids);

      if (error) throw error;

      const updatedRecords = recordsSignal.value.map(r => ids.includes(r.id) ? { ...r, ...data } : r);
      recordsSignal.value = updatedRecords;
      await saveToStorage(updatedRecords);

      return { success: true };
    } catch (error: any) {
      console.error('Error in bulk update:', error);
      return { success: false, error: error.message };
    }
  };

  const bulkDeleteRecords = async (ids: string[]) => {
    try {
      const { error } = await db
        .from('time_records')
        .delete()
        .in('id', ids);

      if (error) throw error;

      const updatedRecords = recordsSignal.value.filter(r => !ids.includes(r.id));
      recordsSignal.value = updatedRecords;
      await saveToStorage(updatedRecords);

      return { success: true };
    } catch (error: any) {
      console.error('Error in bulk delete:', error);
      return { success: false, error: error.message };
    }
  };

  const getTodayRecords = () => {
    const today = new Date().toDateString();
    return recordsSignal.value.filter(r => safeDate(r.recordedAt)?.toDateString() === today);
  };

  // Se não tem dados e não está carregando, dispara fetch inicial se ainda não foi feito pelo loader
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


