export interface DailyReportRepository {
  findAll(where: any, skip: number, take: number, orderBy: any): Promise<any[]>;
  count(where: any): Promise<number>;
  create(data: any): Promise<any>;
}
