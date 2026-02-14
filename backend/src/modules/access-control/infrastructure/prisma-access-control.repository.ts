import { prisma } from "@/lib/prisma/client";
import {
  PermissionLevel,
  PermissionModule,
  PermissionMatrix,
  Prisma,
} from "@prisma/client";
import { AccessControlRepository } from "../domain/access-control.repository";

export class PrismaAccessControlRepository implements AccessControlRepository {
  async findAllLevels(): Promise<PermissionLevel[]> {
    return prisma.permissionLevel.findMany({
      orderBy: { rank: "asc" },
    });
  }

  async findLevelByName(name: string): Promise<PermissionLevel | null> {
    return prisma.permissionLevel.findUnique({
      where: { name },
    });
  }

  async createLevel(
    data: Prisma.PermissionLevelCreateInput,
  ): Promise<PermissionLevel> {
    return prisma.permissionLevel.create({ data });
  }

  async findAllModules(): Promise<PermissionModule[]> {
    return prisma.permissionModule.findMany({
      orderBy: { category: "asc" },
    });
  }

  async createModules(
    data: Prisma.PermissionModuleCreateManyInput[],
  ): Promise<number> {
    const result = await prisma.permissionModule.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  async deleteModules(ids: string[]): Promise<number> {
    const result = await prisma.permissionModule.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  async getMatrixByLevel(levelId: string): Promise<PermissionMatrix[]> {
    return prisma.permissionMatrix.findMany({
      where: { levelId },
      include: { module: true },
    });
  }
}
