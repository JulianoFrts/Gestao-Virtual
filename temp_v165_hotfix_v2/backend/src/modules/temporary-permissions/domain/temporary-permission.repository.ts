import { TemporaryPermission, Prisma } from "@prisma/client";

export interface FindAllParams {
  page: number;
  limit: number;
  userId?: string;
  permissionType?: string;
  active?: "true" | "false";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface TemporaryPermissionRepository {
  create(
    data: Prisma.TemporaryPermissionCreateInput,
  ): Promise<TemporaryPermission>;
  update(
    id: string,
    data: Prisma.TemporaryPermissionUpdateInput,
  ): Promise<TemporaryPermission>;
  updateMany(
    where: Prisma.TemporaryPermissionWhereInput,
    data: Prisma.TemporaryPermissionUpdateInput,
  ): Promise<{ count: number }>;
  findById(id: string): Promise<TemporaryPermission | null>;
  findAll(params: FindAllParams): Promise<PaginatedResult<TemporaryPermission>>;
  delete(id: string): Promise<void>;
}
