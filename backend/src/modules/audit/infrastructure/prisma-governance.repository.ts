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
    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;

    return (prisma as unknown).governanceAuditHistory.findMany({
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
    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;

    return (prisma as unknown).routeHealthHistory.findMany({
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

  async findOpenViolation(file: string, violation: string): Promise<GovernanceAuditHistory | null> {
    return (prisma as unknown).governanceAuditHistory.findFirst({
      where: {
        file,
        violation,
        status: "OPEN",
      },
    });
  }

  async createViolation(data: Partial<GovernanceAuditHistory>): Promise<GovernanceAuditHistory> {
    return (prisma as unknown).governanceAuditHistory.create({
      data: data as unknown,
    });
  }

  async updateViolation(id: string, data: Partial<GovernanceAuditHistory>): Promise<GovernanceAuditHistory> {
    return (prisma as unknown).governanceAuditHistory.update({
      where: { id },
      data: data as unknown,
    });
  }

  async findOpenViolations(): Promise<GovernanceAuditHistory[]> {
    return (prisma as unknown).governanceAuditHistory.findMany({
      where: { status: "OPEN" },
    });
  }

  async findViolationsWithFilters(
    filters: Record<string, unknown>,
    take: number = 100,
    skip: number = 0,
  ): Promise<GovernanceAuditHistory[]> {
    return (prisma as unknown).governanceAuditHistory.findMany({
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

  async countViolations(filters: Record<string, unknown>): Promise<number> {
    return (prisma as unknown).governanceAuditHistory.count({ where: filters });
  }
}
