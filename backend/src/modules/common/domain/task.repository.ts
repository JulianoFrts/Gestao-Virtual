import { TaskQueue } from "@prisma/client";

export interface ITaskRepository {
  create(type: string, payload: any): Promise<TaskQueue>;
  findById(id: string): Promise<TaskQueue | null>;
  updateStatus(id: string, status: string, error?: string): Promise<TaskQueue>;
  findPending(): Promise<TaskQueue | null>;
  listRecent(limit: number): Promise<TaskQueue[]>;
}
