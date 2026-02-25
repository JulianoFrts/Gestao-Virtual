import { PermissionLevelDTO, PermissionMatrixDTO } from "./access-control.dto";

export interface FindAllLevelsParams {
  page: number;
  limit: number;
  name?: string;
}

export interface AccessControlRepository {
  // Levels
  findAllLevels(
    params: FindAllLevelsParams,
  ): Promise<{ items: PermissionLevelDTO[]; total: number }>;
  findLevelByName(name: string): Promise<PermissionLevelDTO | null>;
  createLevel(data: Record<string, unknown>): Promise<PermissionLevelDTO>;

  // Matrix
  findAllMatrix(levelId?: string): Promise<PermissionMatrixDTO[]>;
  createQueueTask(
    type: string,
    payload: Record<string, unknown> | unknown[],
  ): Promise<Record<string, unknown>>;
  updateTaskStatus(taskId: string, status: string): Promise<void>;
}
