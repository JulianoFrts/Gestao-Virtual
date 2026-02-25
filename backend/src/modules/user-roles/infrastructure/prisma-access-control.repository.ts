import { prisma } from "@/lib/prisma/client";
import { Prisma, TaskStatus } from "@prisma/client";
import {
  AccessControlRepository,
  FindAllLevelsParams,
} from "../domain/access-control.repository";
import {
  PermissionLevelDTO,
  PermissionMatrixDTO,
} from "../domain/access-control.dto";

export class PrismaAccessControlRepository implements AccessControlRepository {
  async findAllLevels(
    params: FindAllLevelsParams,
  ): Promise<{ items: PermissionLevelDTO[]; total: number }> {
    const { page, limit, name } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PermissionLevelWhereInput = {};
    if (name) where.name = name;

    const [items, total] = await Promise.all([
      prisma.permissionLevel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.permissionLevel.count({ where }),
    ]);

    return { items: items as PermissionLevelDTO[], total };
  }

  async findLevelByName(name: string): Promise<PermissionLevelDTO | null> {
    return prisma.permissionLevel.findFirst({
      where: { name },
    }) as Promise<PermissionLevelDTO | null>;
  }

  async createLevel(
    data: Record<string, unknown>,
  ): Promise<PermissionLevelDTO> {
    return prisma.permissionLevel.create({
      data: data as Prisma.PermissionLevelCreateInput,
    }) as Promise<PermissionLevelDTO>;
  }

  async findAllMatrix(levelId?: string): Promise<PermissionMatrixDTO[]> {
    return prisma.permissionMatrix.findMany({
      where: levelId ? { levelId } : {},
      orderBy: [{ levelId: "asc" }, { moduleId: "asc" }],
    }) as Promise<PermissionMatrixDTO[]>;
  }

  async createQueueTask(
    type: string,
    payload: Record<string, unknown> | unknown[],
  ): Promise<Record<string, unknown>> {
    return prisma.taskQueue.create({
      data: {
        type,
        payload: payload as Prisma.InputJsonValue,
        status: "pending" as TaskStatus,
      },
    }) as Promise<Record<string, unknown>>;
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    await prisma.taskQueue.update({
      where: { id: taskId },
      data: {
        status: status as TaskStatus,
        // result and completedAt are not in schema
      },
    });
  }
}
