import { prisma } from "@/lib/prisma/client";
import { AuditLogRepository } from "../domain/audit-log.repository";

export class PrismaAuditLogRepository implements AuditLogRepository {
  async findMany(where: any, take: number, orderBy: any): Promise<any[]> {
    return prisma.auditLog.findMany({
      where,
      take,
      orderBy,
      include: {
        user: {
          select: {
            name: true,
            authCredential: { select: { email: true } },
          },
        },
      },
    });
  }

  async create(data: any): Promise<any> {
    return prisma.auditLog.create({ data });
  }
}
