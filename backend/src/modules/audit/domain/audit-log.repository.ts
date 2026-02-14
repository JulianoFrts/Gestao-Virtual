export interface AuditLogRepository {
  findMany(where: any, take: number, orderBy: any): Promise<any[]>;
  create(data: any): Promise<any>;
}
