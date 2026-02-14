import { prisma } from "@/lib/prisma/client";
import {
  TeamRepository,
  FindAllTeamsParams,
  TeamsListResult,
} from "../domain/team.repository";
import { cacheService } from "@/services/cacheService";

export class PrismaTeamRepository implements TeamRepository {
  public prisma = prisma; // Expose for Service transactions
  private readonly CACHE_PREFIX = "teams:";

  async findAll(params: FindAllTeamsParams): Promise<TeamsListResult> {
    const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify(params)}`;
    const cached = await cacheService.get<TeamsListResult>(cacheKey);
    if (cached) return cached;

    const skip = (params.page - 1) * params.limit;
    const where: any = {};

    if (params.companyId) where.companyId = params.companyId;
    if (params.siteId) where.siteId = params.siteId;
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.name)
      where.name = { contains: params.name, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { displayOrder: "asc" },
        include: {
          company: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
          supervisor: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      }),
      prisma.team.count({ where }),
    ]);

    const result = { items, total };
    await cacheService.set(cacheKey, result, 300); // 5 minutes cache
    return result;
  }

  async findById(id: string): Promise<any | null> {
    return prisma.team.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                authCredential: { select: { role: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: any): Promise<any> {
    const result = await prisma.team.create({
      data,
      include: {
        supervisor: { select: { id: true, name: true } },
      },
    });
    await this.invalidateCache();
    return result;
  }

  async update(id: string, data: any): Promise<any> {
    const result = await prisma.team.update({
      where: { id },
      data,
    });
    await this.invalidateCache();
    return result;
  }

  async delete(id: string): Promise<any> {
    const result = await prisma.team.delete({
      where: { id },
    });
    await this.invalidateCache();
    return result;
  }

  private async invalidateCache(): Promise<void> {
    await cacheService.delByPattern(`${this.CACHE_PREFIX}*`);
  }

  async count(where: any): Promise<number> {
    return prisma.team.count({ where });
  }
}
