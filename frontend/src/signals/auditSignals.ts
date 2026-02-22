import { signal, computed } from "@preact/signals-react";
import { orionApi } from "@/integrations/orion/client";
import { currentUserSignal } from "./authSignals";

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE" | string;
  performed_by: string;
  old_data: any;
  new_data: any;
  performed_at: string;
  company_id: string;
  performer_name?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  metadata?: any;
}

export const auditLogs = signal<AuditLog[]>([]);
export const isLoadingAudit = signal<boolean>(false);
export const auditProgress = signal<number>(0);
export const totalAuditLogs = signal<number>(0);

export const auditFilters = signal({
  entity: "",
  action: "",
  dateFrom: "",
  dateTo: "",
});

export const fetchAuditLogs = async () => {
  if (isLoadingAudit.value) return; // Evitar chamadas duplicadas

  const token = orionApi.token;
  const user = currentUserSignal.value;

  console.log("[AuditSignals] Iniciando fetchAuditLogs...", { hasToken: !!token, hasUser: !!user });

  if (!token || !user) {
    console.debug("[AuditSignals] Skip fetch: No active session.");
    return;
  }

  isLoadingAudit.value = true;
  auditLogs.value = [];
  auditProgress.value = 0;
  totalAuditLogs.value = 0;

  try {
    // Construir URL absoluta para EventSource
    const envUrl = import.meta.env.VITE_API_URL || "/api/v1";
    const backendUrl = envUrl.startsWith("http")
      ? envUrl
      : `${window.location.origin}${envUrl.startsWith("/") ? "" : "/"}${envUrl}`;

    // Conexão Segura via POST (evita token na URL)
    const url = `${backendUrl}/audit_logs`;
    
    console.log("[AuditSignals] Conectando via StreamService (POST):", url);
    
    const { StreamService } = await import("@/services/security/StreamService");

    await StreamService.connect({
      url,
      token,
      onMessage: (data) => {
        console.debug("[AuditSignals] Stream Message:", data.type, data);

        if (data.type === "start") {
          totalAuditLogs.value = data.total;
        }

        if (data.type === "batch") {
          auditLogs.value = [...auditLogs.value, ...data.items];
          auditProgress.value = data.progress;
        }

        if (data.type === "complete") {
          auditProgress.value = 100;
          isLoadingAudit.value = false;
        }

        if (data.type === "error") {
          console.error("[Stream Error]", data.message);
          isLoadingAudit.value = false;
        }
      },
      onError: (err) => {
        console.error("[AuditSignals] Erro na conexão Stream de Auditoria:", err);
        isLoadingAudit.value = false;
      }
    });

  } catch (err) {
    console.error("[AuditSignals] Error:", err);
    isLoadingAudit.value = false;
  }
};
