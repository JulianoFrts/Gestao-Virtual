import {
  DailyReportEntity,
  CreateDailyReportDTO,
  UpdateDailyReportDTO,
  DailyReportFiltersDTO,
} from "./daily-report.dto";

export interface DailyReportRepository {
  findAll(params: {
    where?: DailyReportFiltersDTO;
    skip?: number;
    take?: number;
    orderBy?: Record<string, "asc" | "desc">;
  }): Promise<DailyReportEntity[]>;
  count(where: Record<string, any>): Promise<number>;
  findById(id: string): Promise<DailyReportEntity | null>;
  create(data: CreateDailyReportDTO): Promise<DailyReportEntity>;
  update(id: string, data: UpdateDailyReportDTO): Promise<DailyReportEntity>;
  updateMany(ids: string[], data: UpdateDailyReportDTO): Promise<any>;
  findAllMinimal(ids: string[]): Promise<DailyReportEntity[]>;
}
