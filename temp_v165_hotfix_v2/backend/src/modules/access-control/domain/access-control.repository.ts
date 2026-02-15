import {
  PermissionLevel,
  PermissionModule,
  PermissionMatrix,
  Prisma,
} from "@prisma/client";

export interface AccessControlRepository {
  // Permission Levels (Roles)
  findAllLevels(): Promise<PermissionLevel[]>;
  findLevelByName(name: string): Promise<PermissionLevel | null>;
  createLevel(
    data: Prisma.PermissionLevelCreateInput,
  ): Promise<PermissionLevel>;

  // Permission Modules
  findAllModules(): Promise<PermissionModule[]>;
  createModules(
    data: Prisma.PermissionModuleCreateManyInput[],
  ): Promise<number>;
  deleteModules(ids: string[]): Promise<number>;

  // Permission Matrix
  getMatrixByLevel(levelId: string): Promise<PermissionMatrix[]>;
}
