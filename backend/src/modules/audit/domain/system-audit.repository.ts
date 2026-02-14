export interface AuditLogData {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  newValues?: any;
  oldValues?: any;
}

export interface SystemAuditRepository {
  log(data: AuditLogData): Promise<void>;
}
