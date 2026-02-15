import { type Prisma } from "@prisma/client";

export interface PermissionRepository {
    findLevelByName(name: string): Promise<{ id: string } | null>;
    findMatrixByLevelId(levelId: string): Promise<any[]>;
    findUserWithPermissions(userId: string): Promise<any | null>;
    findProjectDelegations(projectId: string, jobFunctionId: string): Promise<any[]>;
}
