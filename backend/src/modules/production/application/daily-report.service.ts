import { DailyReportRepository } from "../domain/daily-report.repository";

export class DailyReportService {
  constructor(private readonly repository: DailyReportRepository) {}

  async listReports(params: any) {
    const {
      page = 1,
      limit = 20,
      teamId,
      userId,
      startDate,
      endDate,
      isAdmin,
      companyId,
    } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (!isAdmin && companyId) {
      where.user = { companyId };
    }
    if (teamId) where.teamId = teamId;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) where.reportDate.gte = new Date(startDate);
      if (endDate) where.reportDate.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.repository.findAll(where, skip, limit, { reportDate: "desc" }),
      this.repository.count(where),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async createReport(data: any) {
    return this.repository.create({
      ...data,
      reportDate: new Date(data.reportDate || new Date()),
    });
  }
}
