import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/database';
import { storageService } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import { generateId, safeDate } from '@/lib/utils';
import { timeRecords as recordsSignal, isLoadingRecords, fetchTimeRecords } from '@/signals/timeSignals';

export interface TimeRecord {
  id: string;
  employeeId: string;
  userId: string;
  employeeName?: string;
  teamId: string | null;
  companyId: string | null;
  recordType: 'entry' | 'exit';
  type: 'IN' | 'OUT';
  photoUrl: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  recordedAt: string | Date;
  createdBy: string | null;
  syncedAt: string | Date | null;
  localId: string | null;
}

export function useTimeRecords() {
  const { toast } = useToast();
  const [localLoading, setLocalLoading] = useState(true);

  const saveToStorage = async (recordsToSave: TimeRecord[]) => {
    // Com IndexedDB não precisamos mais limitar fotos ou quantidade
    await storageService.setItem('timeRecords', recordsToSave);
  };

  const loadRecords = useCallback(async () => {
    console.log('[useTimeRecords] loadRecords started');
    isLoadingRecords.value = true;
    setLocalLoading(true);
    try {
      console.log('[useTimeRecords] Fetching from storage...');
      const localCached = await storageService.getItem<TimeRecord[]>('timeRecords') || [];
      const unsyncedRecords = localCached.filter(r => !r.syncedAt);
      console.log(`[useTimeRecords] Local cached found: ${localCached.length}, Unsynced: ${unsyncedRecords.length}`);

      if (navigator.onLine) {
        console.log('[useTimeRecords] Online: fetching from API...');
        const { data, error } = await db
          .from('time_records')
          .select(`
            *,
            user:users!time_records_user_id_fkey(name)
          `)
          .order('recorded_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('[useTimeRecords] API Error:', error);
          throw error;
        }

        console.log(`[useTimeRecords] API Data received: ${data?.length || 0} items`);
        const mapped = (data || []).map(r => ({
          id: r.id,
          employeeId: r.user_id,
          userId: r.user_id,
          employeeName: r.user?.name,
          teamId: r.team_id,
          companyId: (r as any).company_id,
          recordType: r.record_type as 'entry' | 'exit',
          type: r.record_type === 'entry' ? 'IN' : 'OUT',
          photoUrl: r.photo_url,
          location: r.latitude ? `${r.latitude},${r.longitude}` : 'N/A',
          latitude: r.latitude,
          longitude: r.longitude,
          recordedAt: safeDate(r.recorded_at) || new Date(),
          createdBy: r.created_by,
          syncedAt: safeDate(r.synced_at),
          localId: r.local_id,
        }) as TimeRecord);

        console.log('[useTimeRecords] Mapping finished, merging results...');
        const serverLocalIds = new Set(mapped.map(r => r.localId).filter(Boolean));
        const uniqueUnsynced = unsyncedRecords.filter(r => !r.localId || !serverLocalIds.has(r.localId));

        const mergedRecords = [...uniqueUnsynced, ...mapped];

        recordsSignal.value = mergedRecords;
        console.log('[useTimeRecords] Signal updated, saving to storage...');
        await saveToStorage(mergedRecords);
        console.log('[useTimeRecords] Storage updated');
      } else {
        console.log('[useTimeRecords] Offline: using cached records');
        recordsSignal.value = localCached;
      }
    } catch (error) {
      console.error('[useTimeRecords] Error loading time records:', error);
      const cached = await storageService.getItem<TimeRecord[]>('timeRecords') || [];
      recordsSignal.value = cached;
    } finally {
      console.log('[useTimeRecords] Setting isLoadingRecords to false');
      isLoadingRecords.value = false;
      setLocalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

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

    // Fallback to storage if db fails (try to find the SB token in localStorage)
    if (!userId) {
      // Loop through localStorage to find the db token key (it usually starts with 'sb-')
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

    // Detect manual worker session
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

    // Optimistically update UI
    recordsSignal.value = [newRecord, ...recordsSignal.value];
    // Save to storage immediately
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

        // Update state with confirmed record
        recordsSignal.value = recordsSignal.value.map(r => r.localId === localId ? updatedRecord : r);

        // Update storage - We reconstruct the list using the current 'records' 
        // PLUS the updated record (replacing the optimistic one).
        // Since 'records' captured in closure doesn't have the new record, we prepend it.
        await saveToStorage(recordsSignal.value);

        return { success: true, data: updatedRecord };
      } catch (error: any) {
        console.warn('Online sync failed, falling back to offline mode. Error:', error instanceof Error ? error.message : 'Unknown error');
        // Fallback to offline mode
        await storageService.addToSyncQueue({
          operation: 'insert',
          table: 'time_records',
          data: { ...data, localId, recordedAt: (newRecord.recordedAt instanceof Date ? newRecord.recordedAt : new Date(newRecord.recordedAt)).toISOString(), createdBy: effectiveUserId },
        });

        toast({
          title: 'Salvo offline',
          description: 'Registro salvo no dispositivo. Será sincronizado quando houver conexão.',
          duration: 3000,
        });

        return { success: true, data: newRecord, offline: true };
      }
    } else {
      // Offline mode
      await storageService.addToSyncQueue({
        operation: 'insert',
        table: 'time_records',
        data: { ...data, localId, recordedAt: (newRecord.recordedAt instanceof Date ? newRecord.recordedAt : new Date(newRecord.recordedAt)).toISOString(), createdBy: effectiveUserId },
      });

      toast({
        title: 'Modo Offline',
        description: 'Registro salvo localmente.',
        duration: 3000,
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
          recorded_at: (data.recordedAt instanceof Date ? data.recordedAt : new Date(data.recordedAt!)).toISOString(),
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
      console.warn('Online update failed, falling back to offline mode. Error:', error instanceof Error ? error.message : 'Unknown error');

      // Fallback: update local state immediately
      const updatedRecords = recordsSignal.value.map(r => r.id === id ? { ...r, ...data } : r);
      recordsSignal.value = updatedRecords;
      await saveToStorage(updatedRecords);

      // Add to sync queue
      await storageService.addToSyncQueue({
        operation: 'update',
        table: 'time_records',
        itemId: id,
        data: data,
      });

      toast({
        title: 'Atualização offline',
        description: 'As alterações foram salvas localmente e serão sincronizadas em breve.',
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
      console.warn('Online delete failed, falling back to offline mode. Error:', error instanceof Error ? error.message : 'Unknown error');

      // Fallback: update local state immediately
      const updatedRecords = recordsSignal.value.filter(r => r.id !== id);
      recordsSignal.value = updatedRecords;
      await saveToStorage(updatedRecords);

      // Add to sync queue
      await storageService.addToSyncQueue({
        operation: 'delete',
        table: 'time_records',
        itemId: id,
      });

      toast({
        title: 'Exclusão offline',
        description: 'O registro foi removido localmente e será excluído do servidor em breve.',
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

  return {
    records: recordsSignal.value,
    isLoading: localLoading,
    createRecord,
    updateRecord,
    bulkUpdateRecords,
    bulkDeleteRecords,
    deleteRecord,
    getTodayRecords,
    refresh: loadRecords,
  };
}


