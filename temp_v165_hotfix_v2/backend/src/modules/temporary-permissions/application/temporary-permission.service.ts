import { TemporaryPermissionRepository } from "../domain/temporary-permission.repository";
import { Prisma, TemporaryPermission } from "@prisma/client";

export class TemporaryPermissionService {
  constructor(private readonly repository: TemporaryPermissionRepository) {}

  async createPermission(data: {
    userId: string;
    permissionType: string;
    expiresAt: string | Date;
    grantedBy?: string;
    ticketId?: string;
  }): Promise<TemporaryPermission> {
    return this.repository.create({
      userId: data.userId,
      permissionType: data.permissionType,
      expiresAt: new Date(data.expiresAt),
      grantedBy: data.grantedBy,
      ticket: data.ticketId ? { connect: { id: data.ticketId } } : undefined,
    });
  }

  async listPermissions(params: {
    page: number;
    limit: number;
    userId?: string;
    permissionType?: string;
    active?: "true" | "false";
  }) {
    const { items, total } = await this.repository.findAll(params);
    return this.paginateResults(items, total, params.page, params.limit);
  }

  private paginateResults(
    items: TemporaryPermission[],
    total: number,
    page: number,
    limit: number,
  ) {
    const pages = Math.ceil(total / limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async updatePermission(
    id: string,
    data: {
      permissionType?: string;
      expiresAt?: string | Date;
      usedAt?: string | Date | null;
    },
  ): Promise<TemporaryPermission> {
    const updateData = this.buildUpdateData(data);
    return this.repository.update(id, updateData);
  }

  private buildUpdateData(data: {
    permissionType?: string;
    expiresAt?: string | Date;
    usedAt?: string | Date | null;
  }): Prisma.TemporaryPermissionUpdateInput {
    const updateData: Prisma.TemporaryPermissionUpdateInput = {};

    if (data.permissionType) updateData.permissionType = data.permissionType;
    if (data.expiresAt) updateData.expiresAt = new Date(data.expiresAt);
    if (data.usedAt !== undefined) {
      updateData.usedAt = data.usedAt ? new Date(data.usedAt) : null;
    }

    return updateData;
  }

  async cleanupExpiredPermissions(): Promise<{ count: number }> {
    return this.repository.updateMany(
      {
        expiresAt: { lt: new Date() },
        usedAt: null,
      },
      {
        usedAt: new Date(),
      },
    );
  }

  async getPermissionById(id: string): Promise<TemporaryPermission | null> {
    return this.repository.findById(id);
  }

  async deletePermission(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
