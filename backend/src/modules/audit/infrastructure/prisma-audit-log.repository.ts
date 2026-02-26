import { prisma } from "@/lib/prisma/client";
import { AuditLogRepository } from "../domain/audit-log.repository";

export class PrismaAuditLogRepository implements AuditLogRepository {
  async findMany(
    where: unknown,
    take: number,
    skip: number,
    orderBy: unknown,
  ): Promise<any[]> {
    // Otimização: Não trazer JSONs pesados (newValues/oldValues) na listagem
    return prisma.auditLog.findMany({
      where,
      take,
      skip,
      orderBy,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        ipAddress: true,
        route: true,
        userAgent: true,
        user: {
          select: {
            name: true,
            authCredential: { select: { email: true } },
          },
        },
      },
    });
  }

  async count(where: unknown): Promise<number> {
    return prisma.auditLog.count({ where });
  }

  async create(data: unknown): Promise<unknown> {
    const { metadata, ...rest } = data;
    return prisma.auditLog.create({
      data: {
        ...rest,
        metadata: metadata || {},
      },
    });
  }
}
