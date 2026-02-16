export interface AuditLogRepository {
  findMany(where: any, take: number, skip: number, orderBy: any): Promise<any[]>;
  count(where: any): Promise<number>;
  create(data: any): Promise<any>;
}
