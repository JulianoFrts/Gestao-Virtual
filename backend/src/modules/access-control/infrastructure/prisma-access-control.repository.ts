import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import {
  PermissionLevelDTO,
  PermissionModuleDTO,
  PermissionMatrixDTO,
  PermissionModuleCreateDTO,
} from "../domain/access-control.dto";
import { AccessControlRepository } from "../domain/access-control.repository";

export class PrismaAccessControlRepository implements AccessControlRepository {
  async findAllLevels(): Promise<PermissionLevelDTO[]> {
    return prisma.permissionLevel.findMany({
      orderBy: { rank: "asc" },
    }) as Promise<PermissionLevelDTO[]>;
  }

  async findLevelByName(name: string): Promise<PermissionLevelDTO | null> {
    return prisma.permissionLevel.findUnique({
      where: { name },
    }) as Promise<PermissionLevelDTO | null>;
  }

  async createLevel(
    data: Record<string, unknown>,
  ): Promise<PermissionLevelDTO> {
    return prisma.permissionLevel.create({
      data: data as Prisma.PermissionLevelCreateInput,
    }) as Promise<PermissionLevelDTO>;
  }

  async findAllModules(): Promise<PermissionModuleDTO[]> {
    return prisma.permissionModule.findMany({
      orderBy: { category: "asc" },
    }) as Promise<PermissionModuleDTO[]>;
  }

  async createModules(data: PermissionModuleCreateDTO[]): Promise<number> {
    const result = await prisma.permissionModule.createMany({
      data: data as Prisma.PermissionModuleCreateManyInput[],
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

  async getMatrixByLevel(levelId: string): Promise<PermissionMatrixDTO[]> {
    return prisma.permissionMatrix.findMany({
      where: { levelId },
      include: { module: true },
    }) as Promise<PermissionMatrixDTO[]>;
  }
}
