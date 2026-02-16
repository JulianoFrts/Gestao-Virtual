import { signal, computed } from "@preact/signals-react";
// import { db } from "@/integrations/database"; // Removido em favor de SSE API

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

  isLoadingAudit.value = true;
  auditLogs.value = [];
  auditProgress.value = 0;
  totalAuditLogs.value = 0;

  try {
    const token = localStorage.getItem("token") || localStorage.getItem("orion_token");
    if (!token) throw new Error("Token não encontrado");

    // Construir URL absoluta para EventSource
    const envUrl = import.meta.env.VITE_API_URL || "/api/v1";
    const backendUrl = envUrl.startsWith("http")
      ? envUrl
      : `${window.location.origin}${envUrl.startsWith("/") ? "" : "/"}${envUrl}`;

    // Adicionar filtros na URL se necessário (futuro)
    const sseUrl = `${backendUrl}/audit_logs?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "start") {
          totalAuditLogs.value = data.total;
        }

        if (data.type === "batch") {
          // Adicionar novos logs (evitar duplicatas se necessário, mas aqui confiamos no stream)
          // Usando atribuição de novo array para garantir reatividade
          auditLogs.value = [...auditLogs.value, ...data.items];
          auditProgress.value = data.progress;
        }

        if (data.type === "complete") {
          auditProgress.value = 100;
          isLoadingAudit.value = false;
          eventSource.close();
        }

        if (data.type === "error") {
          console.error("[SSE Error]", data.message);
          eventSource.close();
          isLoadingAudit.value = false;
        }

      } catch (e) {
        console.error("Erro ao processar mensagem SSE", e);
      }
    };

    eventSource.onerror = () => {
      console.error("Erro na conexão SSE de Auditoria");
      eventSource.close();
      isLoadingAudit.value = false;
    };

  } catch (err) {
    console.error("[AuditSignals] Error:", err);
    isLoadingAudit.value = false;
  }
};
