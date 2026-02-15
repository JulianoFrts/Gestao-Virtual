import { prisma } from "@/lib/prisma/client";
import { JobFunctionRepository } from "../domain/job-function.repository";

export class PrismaJobFunctionRepository implements JobFunctionRepository {
  async findAll(
    where: any,
    skip: number,
    take: number,
    orderBy: any,
  ): Promise<any[]> {
    return prisma.jobFunction.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async count(where: any): Promise<number> {
    return prisma.jobFunction.count({ where });
  }

  async findFirst(where: any): Promise<any | null> {
    return prisma.jobFunction.findFirst({ where });
  }

  async create(data: any): Promise<any> {
    return prisma.jobFunction.create({
      data,
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.jobFunction.delete({
      where: { id },
    });
  }

  async checkCompanyExists(companyId: string): Promise<boolean> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    return !!company;
  }
}
