import { TaskEntity } from "./task.dto";

export interface ITaskRepository {
  create(
    type: string,
    payload: Record<string, unknown> | unknown[],
  ): Promise<TaskEntity>;
  findById(id: string): Promise<TaskEntity | null>;
  updateStatus(id: string, status: string, error?: string): Promise<TaskEntity>;
  findPending(): Promise<TaskEntity | null>;
  listRecent(limit: number): Promise<TaskEntity[]>;
}
