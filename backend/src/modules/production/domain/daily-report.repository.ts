export interface DailyReportRepository {
  findAll(where: any, skip: number, take: number, orderBy: any): Promise<any[]>;
  count(where: any): Promise<number>;
  findById(id: string): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  updateMany(ids: string[], data: any): Promise<any>;
  findAllMinimal(ids: string[]): Promise<any[]>;
}
