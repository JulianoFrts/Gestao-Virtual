export interface AuditLogData {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  newValues?: unknown;
  oldValues?: unknown;
}

export interface SystemAuditRepository {
  log(data: AuditLogData): Promise<void>;
}
