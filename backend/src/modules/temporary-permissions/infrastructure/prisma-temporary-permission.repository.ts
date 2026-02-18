import { Prisma, TemporaryPermission } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  FindAllParams,
  PaginatedResult,
  TemporaryPermissionRepository,
} from "../domain/temporary-permission.repository";

export class PrismaTemporaryPermissionRepository implements TemporaryPermissionRepository {
  async create(
    data: Prisma.TemporaryPermissionCreateInput,
  ): Promise<TemporaryPermission> {
    return prisma.temporaryPermission.create({
      data,
      include: {
        systemMessage: { select: { id: true, subject: true } },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.TemporaryPermissionUpdateInput,
  ): Promise<TemporaryPermission> {
    return prisma.temporaryPermission.update({
      where: { id },
      data,
    });
  }

  async updateMany(
    where: Prisma.TemporaryPermissionWhereInput,
    data: Prisma.TemporaryPermissionUpdateInput,
  ): Promise<{ count: number }> {
    return prisma.temporaryPermission.updateMany({
      where,
      data,
    });
  }

  async findById(id: string): Promise<TemporaryPermission | null> {
    return prisma.temporaryPermission.findUnique({
      where: { id },
    });
  }

  async findAll(
    params: FindAllParams,
  ): Promise<PaginatedResult<TemporaryPermission>> {
    const { page, limit, userId, permissionType, active } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.TemporaryPermissionWhereInput = {};
    if (userId) where.userId = userId;
    if (permissionType) where.permissionType = permissionType;

    if (active === "true") {
      where.expiresAt = { gte: new Date() };
      where.usedAt = null;
    } else if (active === "false") {
      where.OR = [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }];
    }

    const [items, total] = await Promise.all([
      prisma.temporaryPermission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          systemMessage: { select: { id: true, subject: true, status: true } },
        },
      }),
      prisma.temporaryPermission.count({ where }),
    ]);

    return { items, total };
  }

  async delete(id: string): Promise<void> {
    await prisma.temporaryPermission.delete({
      where: { id },
    });
  }
}
