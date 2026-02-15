import { signal } from "@preact/signals-react";
import { db } from "@/integrations/database";

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

export const fetchTimeRecords = async () => {
  isLoadingRecords.value = true;
  try {
    const { data, error } = await db
      .from("time_records")
      .select("*")
      .limit(100);
    if (error) throw error;
    if (data) timeRecords.value = data as TimeRecord[];
  } catch (err) {
    console.error("[TimeSignals] Error:", err);
  } finally {
    isLoadingRecords.value = false;
  }
};
