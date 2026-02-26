import { prisma } from "@/lib/prisma/client";
import { TimeRecordRepository } from "../domain/time-record.repository";

export class PrismaTimeRecordRepository implements TimeRecordRepository {
  async findAll(
    where: unknown,
    skip: number,
    take: number,
    orderBy: unknown,
  ): Promise<any[]> {
    return prisma.timeRecord.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: { select: { id: true, name: true, image: true } },
        team: { select: { id: true, name: true } },
      },
    });
  }

  async count(where: unknown): Promise<number> {
    return prisma.timeRecord.count({ where });
  }

  async create(data: unknown): Promise<unknown> {
    return prisma.timeRecord.create({
      data,
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string): Promise<any | null> {
    return prisma.timeRecord.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findUserCompanyId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        affiliation: {
          select: { companyId: true },
        },
      },
    });
    return user?.affiliation?.companyId || null;
  }

  async findProjectId(elementId: string): Promise<string | null> {
    // This might be tricky as TimeRecord doesn't have an elementId directly,
    // but the service might need it for validation. For now, matching the expected interface.
    // If elementId refers to a tower/site, we lookup its project.
    return null;
  }

  async update(id: string, data: unknown): Promise<unknown> {
    const { id: _, user: __, ...updateData } = data;
    return prisma.timeRecord.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.timeRecord.delete({
      where: { id },
    });
  }
}
