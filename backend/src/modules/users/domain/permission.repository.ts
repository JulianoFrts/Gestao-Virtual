// PermissionRepository
export interface PermissionRepository {
  findLevelByName(name: string): Promise<{ id: string } | null>;
  findMatrixByLevelId(levelId: string): Promise<Record<string, unknown>[]>;
  findUserWithPermissions(
    userId: string,
  ): Promise<Record<string, unknown> | null>;
  findProjectDelegations(
    projectId: string,
    jobFunctionId: string,
  ): Promise<Record<string, unknown>[]>;
}
