import { prisma } from "@/lib/prisma/client";
import { TaskStatus, Prisma } from "@prisma/client";
import { ITaskRepository } from "../domain/task.repository";
import { TaskEntity } from "../domain/task.dto";

export class PrismaTaskRepository implements ITaskRepository {
  async create(
    type: string,
    payload: Record<string, unknown> | unknown[],
  ): Promise<TaskEntity> {
    return prisma.taskQueue.create({
      data: {
        type,
        payload: (payload || {}) as Prisma.InputJsonValue,
        status: "pending" as TaskStatus,
      },
    }) as Promise<TaskEntity>;
  }

  async findById(id: string): Promise<TaskEntity | null> {
    return prisma.taskQueue.findUnique({
      where: { id },
    }) as Promise<TaskEntity | null>;
  }

  async updateStatus(
    id: string,
    status: string,
    error?: string,
  ): Promise<TaskEntity> {
    return prisma.taskQueue.update({
      where: { id },
      data: {
        status: status as TaskStatus,
        error: error || null,
        updatedAt: new Date() /* deterministic-bypass */ /* bypass-audit */,
      },
    }) as Promise<TaskEntity>;
  }

  async findPending(): Promise<TaskEntity | null> {
    return prisma.taskQueue.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    }) as Promise<TaskEntity | null>;
  }

  async listRecent(limit: number): Promise<TaskEntity[]> {
    return prisma.taskQueue.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    }) as Promise<TaskEntity[]>;
  }
}
