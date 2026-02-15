import { prisma } from "@/lib/prisma/client";
import { Project, Prisma } from "@prisma/client";
import { ProjectRepository } from "../domain/project.repository";

export class PrismaProjectRepository implements ProjectRepository {
  async findAll(params: {
    where: Prisma.ProjectWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.ProjectOrderByWithRelationInput;
    include?: Prisma.ProjectInclude;
  }): Promise<Partial<Project>[]> {
    return prisma.project.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      include: params.include,
    });
  }

  async count(where: Prisma.ProjectWhereInput): Promise<number> {
    return prisma.project.count({ where });
  }

  async findById(
    id: string,
    include?: Prisma.ProjectInclude,
  ): Promise<Partial<Project> | null> {
    return prisma.project.findUnique({
      where: { id },
      include,
    });
  }

  async create(
    data: Prisma.ProjectCreateInput,
    include?: Prisma.ProjectInclude,
  ): Promise<Partial<Project>> {
    return prisma.project.create({
      data,
      include,
    });
  }

  async update(
    id: string,
    data: Prisma.ProjectUpdateInput,
    include?: Prisma.ProjectInclude,
  ): Promise<Partial<Project>> {
    return prisma.project.update({
      where: { id },
      data,
      include,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({
      where: { id },
    });
  }

  async get3dCableSettings(projectId: string): Promise<any> {
    return prisma.project3dCableSettings.findUnique({
      where: { projectId },
    });
  }

  async upsert3dCableSettings(projectId: string, settings: any): Promise<any> {
    return prisma.project3dCableSettings.upsert({
      where: { projectId },
      update: { settings },
      create: {
        projectId,
        settings,
      },
    });
  }
}
