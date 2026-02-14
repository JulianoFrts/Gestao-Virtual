export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    details?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date;
}
