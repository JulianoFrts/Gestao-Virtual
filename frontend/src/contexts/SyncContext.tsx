import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { db as db, isLocalMode } from "@/integrations/database";
import { storageService } from "@/services/storageService";
import { useToast } from "@/hooks/use-toast";

interface SyncContextType {
  isOnline: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const updatePendingChanges = useCallback(async () => {
    const queue = await storageService.getSyncQueue();
    setPendingChanges(queue.length);
  }, []);

  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setIsConnected(false);
      return false;
    }

    try {
      let healthUrl = "";
      if (isLocalMode) {
        const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
        healthUrl = baseUrl.includes("/api/v1")
          ? `${baseUrl}/health`
          : `${baseUrl}/api/v1/health`;
      }else{
        healthUrl = `${import.meta.env.VITE_DB_URL}/rest/v1`;
      }

      const headers: Record<string, string> = {};
      
      if (!healthUrl) return isLocalMode;

      const response = await fetch(healthUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!response.ok && !isLocalMode) throw new Error("Health check failed");
      // No modo local, se o servidor responder (mesmo com 503), consideramos que há conectividade
      // O 503 geralmente indica que o backend está ocupado ou em warmup.

      setIsOnline(true);
      setIsConnected(true);
      return true;
    } catch (error) {
      if (!isLocalMode) console.warn("Connectivity check failed:", error);
      setIsConnected(isLocalMode); // No local mode, assumimos conectado se falhar o fetch (server down vs health missing)
      return isLocalMode;
    }
  }, []);

  const isSyncingRef = React.useRef(false);

  const syncNow = useCallback(async () => {
    // Evitar múltiplas execuções simultâneas usando um ref para estabilidade
    if (isSyncingRef.current) return;

    // Verificar conectividade real antes de começar
    const connected = await checkConnectivity();
    if (!connected) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      // Create a mutable copy of the queue
      const queueData = await storageService.getSyncQueue();
      const queue = [...queueData];

      if (queue.length === 0) {
        setLastSyncTime(new Date());
        return;
      }

      console.log(`Iniciando sincronização de ${queue.length} itens...`);
      let syncedCount = 0;

      // Helper to update references in the remaining queue items
      const updateQueueReferences = (
        currentQueue: any[],
        oldId: string,
        newId: string,
        startIndex: number,
      ) => {
        for (let i = startIndex; i < currentQueue.length; i++) {
          const item = currentQueue[i];
          if (item.data) {
            Object.keys(item.data).forEach((key) => {
              if (item.data[key] === oldId) {
                item.data[key] = newId;
              }
            });
          }
        }
      };

      for (const item of queue) {
        const syncItem = item as {
          id: number;
          operation: string;
          table: string;
          data?: Record<string, unknown>;
          itemId?: string;
        };

        try {
          if (syncItem.operation === "insert") {
            const insertData = { ...syncItem.data };
            const localId = (insertData.localId || syncItem.itemId) as
              | string
              | undefined;

            const hasLocalIdColumn = ["time_records", "daily_reports"].includes(
              syncItem.table,
            );
            if (!hasLocalIdColumn) {
              delete insertData.localId;
            }

            Object.keys(insertData).forEach((key) => {
              if (insertData[key] === "none") {
                insertData[key] = null;
              }
            });

            const dbData = mapToDbColumns(syncItem.table, insertData);

            let { data, error } = await db
              .from(syncItem.table as any)
              .insert(dbData as any)
              .select()
              .single();

            if (error && error.code === "23505") {
              if (
                syncItem.table === "daily_reports" &&
                dbData["user_id"] &&
                dbData["report_date"]
              ) {
                const { data: existing, error: fetchError } = await (db as any)
                  .from("daily_reports")
                  .select("id")
                  .eq("user_id", dbData["user_id"] as string)
                  .eq("report_date", dbData["report_date"] as string)
                  .maybeSingle();

                if (!fetchError && existing) {
                  const { data: updatedData, error: updateError } = await db
                    .from("daily_reports")
                    .update(dbData as any)
                    .eq("id", existing.id)
                    .select()
                    .single();
                  data = updatedData as any;
                  error = updateError;
                }
              }
            }

            if (error) throw error;

            if (data && (data as any).id && localId) {
              updateQueueReferences(
                queue,
                localId,
                (data as any).id,
                queue.indexOf(item) + 1,
              );
            }
          } else if (syncItem.operation === "update" && syncItem.itemId) {
            const dbData = mapToDbColumns(syncItem.table, syncItem.data || {});
            const { error } = await db
              .from(syncItem.table as any)
              .update(dbData as any)
              .eq("id", syncItem.itemId);
            if (error) throw error;
          } else if (syncItem.operation === "delete" && syncItem.itemId) {
            const { error } = await db
              .from(syncItem.table as any)
              .delete()
              .eq("id", syncItem.itemId);
            if (error) throw error;
          }

          await storageService.removeFromSyncQueue(syncItem.id);
          syncedCount++;
        } catch (error) {
          console.error(
            `Falha ao sincronizar item ${syncItem.id} da tabela ${syncItem.table}:`,
            error,
          );
        }
      }

      if (syncedCount > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${syncedCount} ${syncedCount === 1 ? "item sincronizado" : "itens sincronizados"}`,
        });
      }
    } catch (error) {
      console.error("Erro geral no motor de sincronização:", error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      setLastSyncTime(new Date());
      updatePendingChanges();
    }
  }, [checkConnectivity, toast, updatePendingChanges]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const connected = await checkConnectivity();
      if (connected) {
        const queue = await storageService.getSyncQueue();
        if (queue.length > 0) {
          syncNow();
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsConnected(false);
      toast({
        title: "Sem conexão",
        description: "Suas alterações serão salvas localmente",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    updatePendingChanges();
    checkConnectivity().then(async (connected) => {
      if (connected) {
        const queue = await storageService.getSyncQueue();
        if (queue.length > 0) {
          syncNow();
        }
      }
    });

    // Heartbeat: Check connection and sync every 30 seconds (reduzido para economizar recursos)
    const interval = setInterval(async () => {
      const connected = await checkConnectivity();
      // Usar a referência para evitar dependência do estado isSyncing no useEffect
      if (connected && !isSyncingRef.current) {
        const currentQueue = await storageService.getSyncQueue();
        if (currentQueue.length > 0) {
          syncNow();
        } else {
          updatePendingChanges();
        }
      }
    }, 30000); // 30s é suficiente para heartbeat local

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkConnectivity, syncNow, toast, updatePendingChanges]);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isConnected,
        isSyncing,
        pendingChanges,
        lastSyncTime,
        syncNow,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

// Helper function to map frontend field names to database column names
function mapToDbColumns(
  table: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const mappings: Record<string, Record<string, string>> = {
    job_functions: {
      name: "name",
      description: "description",
      canLeadTeam: "can_lead_team",
    },
    employees: {
      fullName: "full_name",
      registrationNumber: "registration_number",
      functionId: "function_id",
      phone: "phone",
      email: "email",
      isActive: "is_active",
    },
    teams: {
      name: "name",
      supervisorId: "supervisor_id",
      isActive: "is_active",
    },
    time_records: {
      employeeId: "user_id",
      teamId: "team_id",
      recordType: "record_type",
      photoUrl: "photo_url",
      latitude: "latitude",
      longitude: "longitude",
      recordedAt: "recorded_at",
      localId: "local_id",
      createdBy: "created_by",
      companyId: "company_id",
    },
    daily_reports: {
      teamId: "team_id",
      employeeId: "user_id",
      reportDate: "report_date",
      activities: "activities",
      observations: "observations",
      localId: "local_id",
      createdBy: "created_by",
      companyId: "company_id",
    },
  };

  const tableMapping = mappings[table] || {};
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const dbKey = tableMapping[key] || key;
    result[dbKey] = value;
  }

  return result;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
}


