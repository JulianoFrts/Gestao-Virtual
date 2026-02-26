export interface TimeRecordRepository {
  findAll(where: unknown, skip: number, take: number, orderBy: unknown): Promise<any[]>;
  count(where: unknown): Promise<number>;
  create(data: unknown): Promise<unknown>;
  findById(id: string): Promise<any | null>;
  findUserCompanyId(userId: string): Promise<string | null>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<void>;
}
