import { prisma } from "@/lib/prisma/client";
import {
  GovernanceRepository,
  GovernanceAuditHistory,
  RouteHealthHistory,
} from "../domain/governance.repository";

export class PrismaGovernanceRepository implements GovernanceRepository {
  async findGovernanceHistory(
    limit: number,
    companyId?: string,
  ): Promise<GovernanceAuditHistory[]> {
    const where: any = {};
    if (companyId) where.companyId = companyId;

    return (prisma as any).governanceAuditHistory.findMany({
      where,
      take: limit,
      orderBy: { lastDetectedAt: "desc" },
      include: {
        performer: {
          select: {
            name: true,
            image: true,
            authCredential: { select: { role: true } },
          },
        },
      },
    });
  }

  async findRouteHealthHistory(
    limit: number,
    companyId?: string,
  ): Promise<RouteHealthHistory[]> {
    const where: any = {};
    if (companyId) where.companyId = companyId;

    return (prisma as any).routeHealthHistory.findMany({
      where,
      take: limit,
      orderBy: { checkedAt: "desc" },
      include: {
        performer: {
          select: {
            name: true,
            image: true,
            authCredential: { select: { role: true } },
          },
        },
      },
    });
  }

  async findOpenViolation(file: string, violation: string): Promise<any> {
    return (prisma as any).governanceAuditHistory.findFirst({
      where: {
        file,
        violation,
        status: "OPEN",
      },
    });
  }

  async createViolation(data: any): Promise<any> {
    return (prisma as any).governanceAuditHistory.create({
      data,
    });
  }

  async updateViolation(id: string, data: any): Promise<any> {
    return (prisma as any).governanceAuditHistory.update({
      where: { id },
      data,
    });
  }

  async findOpenViolations(): Promise<any[]> {
    return (prisma as any).governanceAuditHistory.findMany({
      where: { status: "OPEN" },
    });
  }

  async findViolationsWithFilters(
    filters: any,
    take: number = 100,
    skip: number = 0,
  ): Promise<GovernanceAuditHistory[]> {
    return (prisma as any).governanceAuditHistory.findMany({
      where: filters,
      take,
      skip,
      include: {
        performer: {
          select: {
            name: true,
            image: true,
            authCredential: { select: { role: true } },
          },
        },
      },
      orderBy: [{ severity: "asc" }, { lastDetectedAt: "desc" }],
    });
  }

  async countViolations(filters: any): Promise<number> {
    return (prisma as any).governanceAuditHistory.count({ where: filters });
  }
}
