import { prisma } from "@/lib/prisma/client";
import {
  GovernanceRepository,
  GovernanceAuditHistory,
  RouteHealthHistory,
} from "../domain/governance.repository";

export class PrismaGovernanceRepository implements GovernanceRepository {
  async findGovernanceHistory(
    limit: number,
  ): Promise<GovernanceAuditHistory[]> {
    return (prisma as any).governanceAuditHistory.findMany({
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

  async findRouteHealthHistory(limit: number): Promise<RouteHealthHistory[]> {
    return (prisma as any).routeHealthHistory.findMany({
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
  ): Promise<GovernanceAuditHistory[]> {
    return (prisma as any).governanceAuditHistory.findMany({
      where: filters,
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
}
