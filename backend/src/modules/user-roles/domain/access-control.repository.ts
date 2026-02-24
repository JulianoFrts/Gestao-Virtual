import { PermissionLevel, PermissionMatrix } from "@prisma/client";

export interface FindAllLevelsParams {
  page: number;
  limit: number;
  name?: string;
}

export interface AccessControlRepository {
  // Levels
  findAllLevels(
    params: FindAllLevelsParams,
  ): Promise<{ items: PermissionLevel[]; total: number }>;
  findLevelByName(name: string): Promise<PermissionLevel | null>;
  createLevel(data: any): Promise<PermissionLevel>;

  // Matrix
  findAllMatrix(levelId?: string): Promise<PermissionMatrix[]>;
  createQueueTask(type: string, payload: any): Promise<any>;
  updateTaskStatus(taskId: string, status: string): Promise<void>;
}
