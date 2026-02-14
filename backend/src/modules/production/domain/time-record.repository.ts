export interface TimeRecordRepository {
  findAll(where: any, skip: number, take: number, orderBy: any): Promise<any[]>;
  count(where: any): Promise<number>;
  create(data: any): Promise<any>;
  findById(id: string): Promise<any | null>;
  findUserCompanyId(userId: string): Promise<string | null>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
}
