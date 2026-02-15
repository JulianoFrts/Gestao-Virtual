import { prisma } from "@/lib/prisma/client";
import { TaskQueue, TaskStatus } from "@prisma/client";
import { ITaskRepository } from "../domain/task.repository";

export class PrismaTaskRepository implements ITaskRepository {
  async create(type: string, payload: any): Promise<TaskQueue> {
    return prisma.taskQueue.create({
      data: {
        type,
        payload: payload || {},
        status: "pending" as TaskStatus,
      },
    });
  }

  async findById(id: string): Promise<TaskQueue | null> {
    return prisma.taskQueue.findUnique({
      where: { id },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    error?: string,
  ): Promise<TaskQueue> {
    return prisma.taskQueue.update({
      where: { id },
      data: {
        status: status as TaskStatus,
        error: error || null,
        updatedAt: new Date(),
      },
    });
  }

  async findPending(): Promise<TaskQueue | null> {
    return prisma.taskQueue.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
  }

  async listRecent(limit: number): Promise<TaskQueue[]> {
    return prisma.taskQueue.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }
}
