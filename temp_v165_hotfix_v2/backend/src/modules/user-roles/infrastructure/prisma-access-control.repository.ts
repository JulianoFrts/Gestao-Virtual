import { prisma } from "@/lib/prisma/client";
import { PermissionLevel, PermissionMatrix } from "@prisma/client";
import {
  AccessControlRepository,
  FindAllLevelsParams,
} from "../domain/access-control.repository";

export class PrismaAccessControlRepository implements AccessControlRepository {
  async findAllLevels(
    params: FindAllLevelsParams,
  ): Promise<{ items: PermissionLevel[]; total: number }> {
    const { page, limit, name } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
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

    return { items, total };
  }

  async findLevelByName(name: string): Promise<PermissionLevel | null> {
    return prisma.permissionLevel.findFirst({
      where: { name },
    });
  }

  async createLevel(data: any): Promise<PermissionLevel> {
    return prisma.permissionLevel.create({ data });
  }

  async findAllMatrix(): Promise<PermissionMatrix[]> {
    return prisma.permissionMatrix.findMany({
      orderBy: [{ levelId: "asc" }, { moduleId: "asc" }],
    });
  }

  async createQueueTask(type: string, payload: any): Promise<any> {
    return prisma.taskQueue.create({
      data: {
        type,
        payload,
        status: "pending",
      },
    });
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    await prisma.taskQueue.update({
      where: { id: taskId },
      data: {
        status: status as any,
        // result and completedAt are not in schema
      },
    });
  }
}
