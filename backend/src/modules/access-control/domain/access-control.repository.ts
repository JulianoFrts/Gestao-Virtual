import {
  PermissionLevelDTO,
  PermissionModuleDTO,
  PermissionMatrixDTO,
  PermissionModuleCreateDTO,
} from "./access-control.dto";

export interface AccessControlRepository {
  // Permission Levels (Roles)
  findAllLevels(): Promise<PermissionLevelDTO[]>;
  findLevelByName(name: string): Promise<PermissionLevelDTO | null>;
  createLevel(data: Record<string, unknown>): Promise<PermissionLevelDTO>;

  // Permission Modules
  findAllModules(): Promise<PermissionModuleDTO[]>;
  createModules(data: PermissionModuleCreateDTO[]): Promise<number>;
  deleteModules(ids: string[]): Promise<number>;

  // Permission Matrix
  getMatrixByLevel(levelId: string): Promise<PermissionMatrixDTO[]>;
}
