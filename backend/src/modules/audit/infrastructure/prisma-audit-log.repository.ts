import { prisma } from "@/lib/prisma/client";
import { AuditLogRepository } from "../domain/audit-log.repository";

export class PrismaAuditLogRepository implements AuditLogRepository {
  async findMany(where: any, take: number, skip: number, orderBy: any): Promise<any[]> {
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
        // user: join simplificado
        user: {
          select: {
            name: true,
            authCredential: { select: { email: true } },
          },
        },
      },
    });
  }

  async count(where: any): Promise<number> {
    return prisma.auditLog.count({ where });
  }

  async create(data: any): Promise<any> {
    return prisma.auditLog.create({ data });
  }
}
