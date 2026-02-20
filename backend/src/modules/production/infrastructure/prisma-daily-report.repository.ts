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

  async findById(id: string): Promise<any | null> {
    return prisma.dailyReport.findUnique({
      where: { id },
      include: {
        team: { 
          select: { 
            id: true, 
            name: true,
            site: { select: { projectId: true } }
          } 
        },
        user: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
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

  async update(id: string, data: any): Promise<any> {
    return prisma.dailyReport.update({
      where: { id },
      data,
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async updateMany(ids: string[], data: any): Promise<any> {
    const updates = ids.map(id => 
      prisma.dailyReport.update({
        where: { id },
        data
      })
    );
    return Promise.all(updates);
  }

  async findAllMinimal(ids: string[]): Promise<any[]> {
    return prisma.dailyReport.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        metadata: true,
        team: {
          select: {
            site: {
              select: { projectId: true }
            }
          }
        }
      },
    });
  }
}
