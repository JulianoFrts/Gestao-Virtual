import { prisma } from "@/lib/prisma/client";
import { ProductionScheduleRepository } from "../domain/production-schedule.repository";

export class PrismaProductionScheduleRepository implements ProductionScheduleRepository {
  async findSchedule(elementId: string, activityId: string): Promise<any | null> {
    return await prisma.activitySchedule.findFirst({
      where: { elementId, activityId },
    });
  }

  async findScheduleByElement(elementId: string, activityId: string): Promise<any | null> {
    return await prisma.activitySchedule.findFirst({
      where: { elementId, activityId },
    });
  }

  async findScheduleById(id: string): Promise<any | null> {
    return await prisma.activitySchedule.findUnique({
      where: { id },
    });
  }

  async saveSchedule(data: any): Promise<any> {
    if (data.id) {
      return await prisma.activitySchedule.update({
        where: { id: data.id },
        data,
      });
    }
    return await prisma.activitySchedule.create({ data });
  }

  async deleteSchedule(id: string): Promise<void> {
    await prisma.activitySchedule.delete({ where: { id } });
  }

  async deleteSchedulesBatch(ids: string[]): Promise<number> {
    const result = await prisma.activitySchedule.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  async findSchedulesByScope(params: {
    projectId?: string;
    companyId?: string;
    elementId?: string;
    activityId?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]> {
    const where: any = {};

    if (params.projectId && params.projectId !== "all") {
      where.mapElementTechnicalData = { projectId: params.projectId };
    }

    if (params.elementId) {
      where.elementId = params.elementId;
    }

    if (params.companyId) {
      where.mapElementTechnicalData = {
        ...where.mapElementTechnicalData,
        companyId: params.companyId,
      };
    }

    if (params.activityId) {
      where.activityId = params.activityId;
    }

    if (params.dateRange) {
      where.AND = [
        { plannedStart: { lte: params.dateRange.end } },
        { plannedEnd: { gte: params.dateRange.start } },
      ];
    }

    return await prisma.activitySchedule.findMany({
      where,
      include: {
        mapElementTechnicalData: { select: { id: true, externalId: true, name: true } },
        productionActivity: { select: { name: true } },
      },
      orderBy: { plannedStart: "asc" },
    });
  }

  async splitSchedule(id: string, updateData: any, createData: any): Promise<void> {
    await prisma.$transaction([
      prisma.activitySchedule.update({
        where: { id },
        data: updateData,
      }),
      prisma.activitySchedule.create({
        data: createData,
      }),
    ]);
  }
}
