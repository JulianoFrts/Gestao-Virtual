import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { ProjectRepository } from "../domain/project.repository";
import {
  ProjectEntity,
  ProjectFiltersDTO,
  CreateProjectDTO,
  UpdateProjectDTO,
} from "../domain/project.dto";
import { randomUUID } from "crypto";

export class PrismaProjectRepository implements ProjectRepository {
  async findAll(params: {
    where: ProjectFiltersDTO;
    skip: number;
    take: number;
    orderBy?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<ProjectEntity[]> {
    return prisma.project.findMany({
      where: params.where as Prisma.ProjectWhereInput,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy as Prisma.ProjectOrderByWithRelationInput,
      select: params.select as Prisma.ProjectSelect,
    }) as Promise<ProjectEntity[]>;
  }

  async count(where: ProjectFiltersDTO): Promise<number> {
    return prisma.project.count({
      where: where as Prisma.ProjectWhereInput,
    });
  }

  async findById(
    id: string,
    select?: Record<string, unknown>,
  ): Promise<ProjectEntity | null> {
    return prisma.project.findUnique({
      where: { id },
      select: select as Prisma.ProjectSelect,
    }) as Promise<ProjectEntity | null>;
  }

  async create(
    data: CreateProjectDTO,
    select?: Record<string, unknown>,
  ): Promise<ProjectEntity> {
    return prisma.project.create({
      data: data as unknown as Prisma.ProjectUncheckedCreateInput,
      select: select as Prisma.ProjectSelect,
    }) as Promise<ProjectEntity>;
  }

  async update(
    id: string,
    data: UpdateProjectDTO,
    select?: Record<string, unknown>,
  ): Promise<ProjectEntity> {
    return prisma.project.update({
      where: { id },
      data: data as unknown as Prisma.ProjectUncheckedUpdateInput,
      select: select as Prisma.ProjectSelect,
    }) as Promise<ProjectEntity>;
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({
      where: { id },
    });
  }

  async get3dCableSettings(
    projectId: string,
  ): Promise<Record<string, unknown> | null> {
    const result = await prisma.project3dCableSettings.findUnique({
      where: { projectId },
    });
    return result as Record<string, unknown> | null;
  }

  async upsert3dCableSettings(
    projectId: string,
    settings: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result = await prisma.project3dCableSettings.upsert({
      where: { projectId },
      update: { settings: settings as Prisma.InputJsonValue },
      create: {
        id: randomUUID(),
        projectId,
        settings: settings as Prisma.InputJsonValue,
      },
    });
    return result as Record<string, unknown>;
  }
}
