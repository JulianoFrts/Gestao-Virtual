import { signal } from "@preact/signals-react";
import { db } from "@/integrations/database";
import { storageService } from "@/services/storageService";
import { safeDate } from "@/lib/utils";

export interface TimeRecord {
  id: string;
  employeeId: string;
  userId: string;
  employeeName?: string;
  teamId: string | null;
  companyId: string | null;
  recordType: "entry" | "exit";
  type: "IN" | "OUT";
  photoUrl: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  recordedAt: string | Date;
  createdBy: string | null;
  syncedAt: string | Date | null;
  localId: string | null;
}

export const timeRecords = signal<TimeRecord[]>([]);
export const isLoadingRecords = signal<boolean>(false);
export const hasTimeRecordsFetchedSignal = signal<boolean>(false);

export const fetchTimeRecords = async (force = false) => {
  if (!force && hasTimeRecordsFetchedSignal.value && timeRecords.value.length > 0) return;

  isLoadingRecords.value = true;
  try {
    const localCached = await storageService.getItem<TimeRecord[]>('timeRecords') || [];

    if (!navigator.onLine) {
      timeRecords.value = localCached;
      hasTimeRecordsFetchedSignal.value = true;
      return;
    }

    const { data, error } = await db
      .from("time_records")
      .select(`
        *,
        user:users!time_records_user_id_fkey(name)
      `)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    if (data) {
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

      // Merge com não sincronizados locais
      const unsynced = localCached.filter(r => !r.syncedAt);
      const serverLocalIds = new Set(mapped.map(r => r.localId).filter(Boolean));
      const uniqueUnsynced = unsynced.filter(r => !r.localId || !serverLocalIds.has(r.localId));

      const merged = [...uniqueUnsynced, ...mapped];
      timeRecords.value = merged;
      await storageService.setItem('timeRecords', merged);
    }
  } catch (err) {
    console.error("[TimeSignals] Error:", err);
    // Fallback
    const cached = await storageService.getItem<TimeRecord[]>('timeRecords');
    if (cached) {
      timeRecords.value = cached;
    }
  } finally {
    hasTimeRecordsFetchedSignal.value = true;
    isLoadingRecords.value = false;
  }
};
