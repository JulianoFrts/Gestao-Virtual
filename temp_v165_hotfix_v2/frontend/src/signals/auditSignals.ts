import { signal, computed } from "@preact/signals-react";
import { db } from "@/integrations/database";

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
export const auditFilters = signal({
  entity: "",
  action: "",
  dateFrom: "",
  dateTo: "",
});

export const fetchAuditLogs = async () => {
  isLoadingAudit.value = true;
  try {
    const { data, error } = await db.from("audit_logs").select("*").limit(100);
    if (error) throw error;
    if (data) auditLogs.value = data as AuditLog[];
  } catch (err) {
    console.error("[AuditSignals] Error:", err);
  } finally {
    isLoadingAudit.value = false;
  }
};
