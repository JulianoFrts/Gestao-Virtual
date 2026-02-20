import { useState, useEffect, useCallback } from 'react';
import { db } from "@/integrations/database";
import { orionApi } from '@/integrations/orion/client';
import { storageService } from "@/services/storageService";
import { useToast } from "@/hooks/use-toast";
import { generateId, safeDate } from "@/lib/utils";

export enum DailyReportStatus {
  PROGRAMMED = 'PROGRAMMED',
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  RETURNED = 'RETURNED'
}

export enum ActivityStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  BLOCKED = 'BLOCKED'
}

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
  status: DailyReportStatus;
  approvedById?: string | null;
  rejectionReason?: string | null;
  createdAt: Date;
  weather?: any;
  manpower?: any[];
  equipment?: any[];
  rdoNumber?: string | null;
  revision?: string | null;
  projectDeadline?: number | null;
  scheduledAt?: Date | null;
  executedAt?: Date | null;
  reviewedAt?: Date | null;
}

export function useDailyReports() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const saveToStorage = async (reportsToSave: DailyReport[]) => {
    // Com IndexedDB não temos mais o limite de 5MB
    await storageService.setItem("dailyReports", reportsToSave);
  };

  const loadReports = useCallback(async (options?: { hard?: boolean }) => {
    setIsLoading(true);
    try {
      if (options?.hard) {
        await storageService.removeItem("dailyReports");
      }

      // Always load local reports first to preserve offline data
      const localCached =
        (await storageService.getItem<DailyReport[]>("dailyReports")) || [];
      const unsyncedReports = localCached.filter((r) => !r.syncedAt);

      if (navigator.onLine) {
        const { data, error } = await orionApi
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

        console.log("[useDailyReports] RAW Data from Supabase:", data.slice(0, 3));

        const mapped = (data || []).map(
          (r) => {
            const mappedReport = {
              id: r.id,
              teamId: r.teamId || r.team_id,
              teamName: r.team?.name || r.teams?.name,
              userId: r.userId || r.user_id,
              userName: r.user?.name || (r as any).userName || "Sistema",
              reportDate: safeDate(r.reportDate || r.report_date) || new Date(),
              activities: r.activities,
              observations: r.observations,
              subPoint: r.subPoint || r.sub_point,
              subPointType: r.subPointType || r.sub_point_type,
              metadata: r.metadata,
              selectedActivities: (r.metadata as any)?.selectedActivities || [],
              employeeId: r.employeeId || r.userId || r.user_id || r.employee_id,
              companyId: r.companyId || (r as any).company_id,
              status: (r.status as DailyReportStatus) || DailyReportStatus.SENT,
              approvedById: r.approvedById || r.approved_by_id,
              rejectionReason: r.rejectionReason || r.rejection_reason,
              createdBy: r.createdBy || r.created_by,
              syncedAt: safeDate(r.syncedAt || r.synced_at),
              weather: r.weather || (r.metadata as any)?.weather,
              manpower: r.manpower || (r.metadata as any)?.manpower,
              equipment: r.equipment || (r.metadata as any)?.equipment,
              rdoNumber: r.rdoNumber || r.rdo_number || (r.metadata as any)?.rdoNumber,
              revision: r.revision || (r.metadata as any)?.revision,
              projectDeadline: r.projectDeadline || r.project_deadline || (r.metadata as any)?.projectDeadline,
              localId: r.localId || r.local_id,
              createdAt: safeDate(r.createdAt || r.created_at) || new Date(),
              scheduledAt: safeDate(r.scheduledAt || r.scheduled_at),
              executedAt: safeDate(r.executedAt || r.executed_at),
              reviewedAt: safeDate(r.reviewedAt || r.reviewed_at),
            } as DailyReport;
            
            if (r.status === DailyReportStatus.PROGRAMMED) {
              console.log("[useDailyReports] Mapping Programmed Report:", { rawUserId: r.user_id, rawEmployeeId: r.employee_id, mappedEmployeeId: mappedReport.employeeId, status: r.status });
            }
            return mappedReport;
          }
        );

        // Merge unsynced local reports with server reports
        // Filter out any local reports that might be present in server data
        const serverLocalIds = new Set(
          mapped.map((r) => r.localId).filter(Boolean),
        );
        const uniqueUnsynced = unsyncedReports.filter(
          (r) => !r.localId || !serverLocalIds.has(r.localId),
        );

        // Priorizar DADOS DO SERVIDOR (mapped) sobre dados locais (uniqueUnsynced)
        // Isso garante que mudanças de status no server reflitam imediatamente
        const mergedReports = [...mapped, ...uniqueUnsynced];
        
        // Final deduplication by ID to prevent memory bloat/key collisions
        const seenIds = new Set();
        const deduplicated = mergedReports.filter(r => {
          if (seenIds.has(r.id)) return false;
          seenIds.add(r.id);
          return true;
        });

        console.log("[useDailyReports] Final deduplicated reports count:", deduplicated.length);
        setReports(deduplicated);
        await saveToStorage(deduplicated);
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
    status?: DailyReportStatus;
    metadata?: any;
    selectedActivities?: Array<{ stageId: string; status: ActivityStatus }>;
    weather?: any;
    manpower?: any[];
    equipment?: any[];
    rdoNumber?: string;
    revision?: string;
    projectDeadline?: number;
    reportDate?: string | Date;
    generalObservations?: string;
    generalPhotos?: any[];
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

    const parsedDate = data.reportDate ? (safeDate(data.reportDate) || today) : today;

    const newReport: DailyReport = {
      id: localId,
      teamId: data.teamId || null,
      reportDate: parsedDate,
      activities: data.activities,
      observations: data.observations || null,
      employeeId: data.employeeId,
      companyId: data.companyId || null,
      createdBy: effectiveUserId,
      subPoint: data.subPoint || null,
      subPointType: (data.subPointType as any) || null,
      metadata: reportMetadata,
      selectedActivities: reportMetadata.selectedActivities,
      status: (data.status as DailyReportStatus) || DailyReportStatus.SENT,
      syncedAt: null,
      localId,
      createdAt: today,
      weather: data.weather,
      manpower: data.manpower,
      equipment: data.equipment,
      rdoNumber: data.rdoNumber,
      revision: data.revision,
      projectDeadline: data.projectDeadline,
    };

    const isOnline = navigator.onLine;

    // Optimistically update UI
    setReports((prev) => [newReport, ...prev]);
    const currentStorage =
      (await storageService.getItem<DailyReport[]>("dailyReports")) || [];
    await saveToStorage([newReport, ...currentStorage]);

    if (isOnline) {
      try {
        // Obter a data local no formato YYYY-MM-DD considerando fuso horário
        // Se foi providenciado uma data (ex: do agendamento) em formato string ISO date
        const localDateStr = typeof data.reportDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.reportDate)
          ? data.reportDate
          : new Date(parsedDate.getTime() - (parsedDate.getTimezoneOffset() * 60000)).toISOString().split("T")[0];

        const { data: created, error } = await db
          .from("daily_reports")
          .insert({
            team_id: data.teamId || null,
            report_date: localDateStr,
            activities: data.activities,
            observations: data.observations || null,
            user_id: data.employeeId, // Mapeado para user_id na tabela users
            company_id: data.companyId || null,
            created_by: effectiveUserId,
            sub_point: data.subPoint || null,
            sub_point_type: data.subPointType || null,
            metadata: reportMetadata,
            status: (data.status as DailyReportStatus) || DailyReportStatus.SENT,
            synced_at: new Date().toISOString(),
            local_id: localId,
            weather: data.weather,
            manpower: data.manpower,
            equipment: data.equipment,
            rdo_number: data.rdoNumber,
            revision: data.revision,
            project_deadline: data.projectDeadline,
          } as any)
          .select(`*, teams(name), user:users!daily_reports_user_id_fkey(name)`)
          .single();

        if (error) throw error;

        const updatedReport = {
          ...newReport,
          id: created.id,
          employeeId: created.user_id, // Fix missing mapped property
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
    // Pegamos a data atual e aplicamos o offset de fuso horário local para garantir a string YYYY-MM-DD correta do local do usuário
    const now = new Date();
    const todayLocalStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
    
    return reports.filter((r) => {
      // Sempre incluir relatórios retornados para correção, indepedente da data
      if (r.status === DailyReportStatus.RETURNED) return true;

      if (!r.reportDate) return false;
      
      // Se já for string YYYY-MM-DD, compara direto
      if (typeof r.reportDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.reportDate)) {
        return r.reportDate === todayLocalStr;
      }
      
      // Do contrário faz o parse seguro e extrai o formato YYYY-MM-DD local
      const parsed = safeDate(r.reportDate);
      if (!parsed) return false;
      const rDateLocalStr = new Date(parsed.getTime() - (parsed.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
      
      return rDateLocalStr === todayLocalStr;
    });
  };

  return {
    reports,
    isLoading,
    createReport,
    getTodayReports,
    refresh: loadReports,
  };
}


