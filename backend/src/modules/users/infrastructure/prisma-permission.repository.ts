import { prisma } from "@/lib/prisma/client";
import { PermissionRepository } from "../domain/permission.repository";

export class PrismaPermissionRepository implements PermissionRepository {
    async findLevelByName(name: string) {
        return prisma.permissionLevel.findFirst({
            where: {
                OR: [{ name: name.toUpperCase() }, { name: name }],
            },
            select: { id: true },
        });
    }

    async findMatrixByLevelId(levelId: string) {
        return prisma.permissionMatrix.findMany({
            where: { levelId },
            include: {
                permissionModule: {
                    select: { code: true },
                },
            },
        });
    }

    async findUserWithPermissions(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                functionId: true,
                permissions: true
            },
        });
    }

    async findProjectDelegations(projectId: string, jobFunctionId: string) {
        return prisma.projectPermissionDelegation.findMany({
            where: {
                projectId,
                jobFunctionId,
            },
            include: {
                permissionModule: { select: { code: true } },
            },
        });
    }
}
