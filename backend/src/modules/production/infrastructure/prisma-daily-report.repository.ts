import { prisma } from "@/lib/prisma/client";
import { DailyReportRepository } from "../domain/daily-report.repository";

export class PrismaDailyReportRepository implements DailyReportRepository {
  async findAll(
    where: any,
    skip: number,
    take: number,
    orderBy: any,
  ): Promise<any[]> {
    return prisma.dailyReport.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async count(where: any): Promise<number> {
    return prisma.dailyReport.count({ where });
  }

  async create(data: any): Promise<any> {
    return prisma.dailyReport.create({
      data,
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }
}
