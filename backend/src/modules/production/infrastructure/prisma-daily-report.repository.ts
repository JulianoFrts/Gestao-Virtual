import { prisma, ExtendedPrismaClient } from "@/lib/prisma/client";
import { DailyReportRepository } from "../domain/daily-report.repository";
import {
  DailyReportEntity,
  CreateDailyReportDTO,
  UpdateDailyReportDTO,
  DailyReportFiltersDTO,
} from "../domain/daily-report.dto";
import { PrismaBaseRepository } from "../../common/infrastructure/prisma-base.repository";

export class PrismaDailyReportRepository
  extends PrismaBaseRepository<
    DailyReportEntity,
    CreateDailyReportDTO,
    UpdateDailyReportDTO,
    DailyReportFiltersDTO
  >
  implements DailyReportRepository
{
  protected model = this.prisma.dailyReport;

  constructor(prismaInstance?: ExtendedPrismaClient) {
    super(prismaInstance);
  }

  async findAll(params: {
    where?: DailyReportFiltersDTO;
    skip?: number;
    take?: number;
    orderBy?: Record<string, "asc" | "desc">;
  }): Promise<DailyReportEntity[]> {
    return this.model.findMany({
      where: params.where as unknown,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    }) as Promise<DailyReportEntity[]>;
  }

  async findById(id: string): Promise<DailyReportEntity | null> {
    return this.model.findUnique({
      where: { id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            supervisor: { select: { name: true } },
            site: { select: { projectId: true } },
          },
        },
        user: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }) as Promise<DailyReportEntity | null>;
  }

  async create(data: CreateDailyReportDTO): Promise<DailyReportEntity> {
    return this.model.create({
      data: data as unknown,
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    }) as Promise<DailyReportEntity>;
  }

  async update(
    id: string,
    data: UpdateDailyReportDTO,
  ): Promise<DailyReportEntity> {
    return this.model.update({
      where: { id },
      data: data as unknown,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            supervisor: { select: { name: true } },
          },
        },
        user: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }) as Promise<DailyReportEntity>;
  }

  async updateMany(ids: string[], data: UpdateDailyReportDTO): Promise<unknown> {
    const updates = ids.map((id) =>
      this.model.update({
        where: { id },
        data: data as unknown,
      }),
    );
    return Promise.all(updates);
  }

  async findAllMinimal(ids: string[]): Promise<DailyReportEntity[]> {
    return this.model.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        metadata: true,
        user: { select: { name: true } },
        team: {
          select: {
            name: true,
            supervisor: { select: { name: true } },
            site: {
              select: { projectId: true },
            },
          },
        },
      },
    }) as Promise<DailyReportEntity[]>;
  }
}
