export interface AuditLogRepository {
  findMany(where: unknown, take: number, skip: number, orderBy: unknown): Promise<any[]>;
  count(where: unknown): Promise<number>;
  create(data: unknown): Promise<unknown>;
}
