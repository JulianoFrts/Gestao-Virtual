import { useState, useEffect, useCallback } from 'react';
import { db } from "@/integrations/database";
import { storageService } from "@/services/storageService";
import { useToast } from "@/hooks/use-toast";
import { generateId, safeDate } from "@/lib/utils";

export interface DailyReport {
  id: string;
  teamId: string | null;
  teamName?: string;
  employeeId: string | null;
  employeeName?: string;
  reportDate: Date;
  activities: string;
  observations: string | null;
  companyId: string | null;
  createdBy: string | null;
  syncedAt: Date | null;
  localId: string | null;
  subPoint?: string | null;
  subPointType?: "TORRE" | "VAO" | "TRECHO" | "GERAL" | null;
  metadata?: any;
  selectedActivities?: any[];
  createdAt: Date;
}

export function useDailyReports() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const saveToStorage = async (reportsToSave: DailyReport[]) => {
    // Com IndexedDB não temos mais o limite de 5MB
    await storageService.setItem("dailyReports", reportsToSave);
  };

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      // Always load local reports first to preserve offline data
      const localCached =
        (await storageService.getItem<DailyReport[]>("dailyReports")) || [];
      const unsyncedReports = localCached.filter((r) => !r.syncedAt);

      if (navigator.onLine) {
        const { data, error } = await db
          .from("daily_reports")
          .select(
            `
            *,
            user:users!daily_reports_user_id_fkey(name)
          `,
          )
          .order("report_date", { ascending: false })
          .limit(100);

        if (error) throw error;

        const mapped = (data || []).map(
          (r) =>
            ({
              id: r.id,
              teamId: r.team_id,
              teamName: r.teams?.name, // This will be undefined if teams are not selected
              userId: r.user_id,
              userName: (r as any).user?.name || "Sistema",
              reportDate: safeDate(r.report_date) || new Date(),
              activities: r.activities,
              observations: r.observations,
              subPoint: r.sub_point,
              subPointType: r.sub_point_type,
              metadata: r.metadata,
              selectedActivities: (r.metadata as any)?.selectedActivities || [],
              employeeId: r.user_id, // Mapeado corretamente para user_id
              companyId: (r as any).company_id,
              createdBy: r.created_by,
              syncedAt: safeDate(r.synced_at),
              localId: r.local_id,
              createdAt: safeDate(r.created_at) || new Date(),
            }) as DailyReport,
        );

        // Merge unsynced local reports with server reports
        // Filter out any local reports that might be present in server data
        const serverLocalIds = new Set(
          mapped.map((r) => r.localId).filter(Boolean),
        );
        const uniqueUnsynced = unsyncedReports.filter(
          (r) => !r.localId || !serverLocalIds.has(r.localId),
        );

        const mergedReports = [...uniqueUnsynced, ...mapped];

        setReports(mergedReports);
        await saveToStorage(mergedReports);
      } else {
        setReports(localCached);
      }
    } catch (error) {
      console.error("Error loading daily reports:", error);
      const cached =
        (await storageService.getItem<DailyReport[]>("dailyReports")) || [];
      setReports(cached);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const createReport = async (data: {
    teamId?: string;
    employeeId: string;
    companyId?: string;
    activities: string;
    observations?: string;
    teamIds?: string[];
    subPoint?: string;
    subPointType?: string;
    metadata?: any;
    selectedActivities?: Array<{ stageId: string; status: 'IN_PROGRESS' | 'FINISHED' }>;
  }) => {
    const localId = generateId();

    // Auth check that works offline
    let userId = null;
    try {
      const session = await db.auth.getSession();
      userId = session.data.session?.user?.id || null;
    } catch (e) {
      console.warn("Network auth check failed, using local fallback");
    }

    // Fallback to storage if db fails (try to find the SB token in localStorage)
    if (!userId) {
      // Loop through localStorage to find the db token key
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
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
    const manualSession = await storageService.getItem("manual_worker_session");
    const isManualWorker = !!manualSession;
    const effectiveUserId = isManualWorker ? null : userId;

    const today = new Date();

    const reportMetadata = { ...(data.metadata || {}), teamIds: data.teamIds || [], selectedActivities: data.selectedActivities || data.metadata?.selectedActivities || [] };

    const newReport: DailyReport = {
      id: localId,
      teamId: data.teamId || null,
      reportDate: today,
      activities: data.activities,
      observations: data.observations || null,
      employeeId: data.employeeId,
      companyId: data.companyId || null,
      createdBy: effectiveUserId,
      subPoint: data.subPoint || null,
      subPointType: (data.subPointType as any) || null,
      metadata: reportMetadata,
      selectedActivities: reportMetadata.selectedActivities,
      syncedAt: null,
      localId,
      createdAt: today,
    };

    const isOnline = navigator.onLine;

    // Optimistically update UI
    setReports((prev) => [newReport, ...prev]);
    const currentStorage =
      (await storageService.getItem<DailyReport[]>("dailyReports")) || [];
    await saveToStorage([newReport, ...currentStorage]);

    if (isOnline) {
      try {
        const { data: created, error } = await db
          .from("daily_reports")
          .insert({
            team_id: data.teamId || null,
            report_date: today.toISOString().split("T")[0],
            activities: data.activities,
            observations: data.observations || null,
            user_id: data.employeeId, // Mapeado para user_id na tabela users
            company_id: data.companyId || null,
            created_by: effectiveUserId,
            sub_point: data.subPoint || null,
            sub_point_type: data.subPointType || null,
            metadata: reportMetadata,
            synced_at: new Date().toISOString(),
            local_id: localId,
          } as any)
          .select(`*, teams(name), user:users!daily_reports_user_id_fkey(name)`)
          .single();

        if (error) throw error;

        const updatedReport = {
          ...newReport,
          id: created.id,
          teamName: created.teams?.name,
          syncedAt: new Date(created.synced_at || new Date()),
        };

        // Update state
        setReports((prev) =>
          prev.map((r) => (r.localId === localId ? updatedReport : r)),
        );

        // Update storage correctly!
        const freshStorage =
          (await storageService.getItem<DailyReport[]>("dailyReports")) || [];
        const updatedStorage = freshStorage.map((r) =>
          r.localId === localId ? updatedReport : r,
        );
        await saveToStorage(updatedStorage);

        return { success: true, data: updatedReport };
      } catch (error: any) {
        console.warn(
          "Online sync failed, falling back to offline mode:",
          error,
        );

        await storageService.addToSyncQueue({
          operation: "insert",
          table: "daily_reports",
          data: {
            ...data,
            localId,
            reportDate: today.toISOString(),
            createdBy: userId,
          },
        });

        toast({
          title: "Salvo offline",
          description:
            "Relatório salvo localmente. Será sincronizado quando houver conexão.",
          duration: 3000,
        });

        return { success: true, data: newReport, offline: true };
      }
    } else {
      await storageService.addToSyncQueue({
        operation: "insert",
        table: "daily_reports",
        data: {
          ...data,
          localId,
          reportDate: today.toISOString(),
          createdBy: userId,
        },
      });

      toast({
        title: "Modo Offline",
        description: "Relatório salvo localmente.",
        duration: 3000,
      });

      return { success: true, data: newReport, offline: true };
    }
  };

  const getTodayReports = () => {
    const today = new Date().toDateString();
    return reports.filter(
      (r) => safeDate(r.reportDate)?.toDateString() === today,
    );
  };

  return {
    reports,
    isLoading,
    createReport,
    getTodayReports,
    refresh: loadReports,
  };
}


