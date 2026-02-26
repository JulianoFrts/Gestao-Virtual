import { prisma } from "@/lib/prisma/client";
import {
  SiteRepository,
  FindAllSitesParams,
  SitesListResult,
} from "../domain/site.repository";

export class PrismaSiteRepository implements SiteRepository {
  async findAll(params: FindAllSitesParams): Promise<SitesListResult> {
    const skip = (params.page - 1) * params.limit;
    const where = this.buildWhereClause(params);

    const [items, total] = await Promise.all([
      prisma.site.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { name: "asc" },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              companyId: true,
              company: { select: { name: true } },
            },
          },
          _count: { select: { userAffiliations: true, teams: true } },
          responsibles: { select: { userId: true } },
        },
      }),
      prisma.site.count({ where }),
    ]);

    // Map the responsibles to simpler responsibleIds array for frontend
    const mappedItems = items.map((element: unknown) => ({
      ...element,
      responsibleIds: element.responsibles?.map((r: unknown) => r.userId) || [],
    }));

    return { items: mappedItems, total };
  }

  private buildWhereClause(params: FindAllSitesParams): any {
    const where: unknown = {};

    if (params.projectId) {
      if (!params.isGlobalAccess && params.companyId) {
        where.projectId = params.projectId;
        // Forçar vínculo com a empresa mesmo se passar projectId
        where.project = { companyId: params.companyId };
      } else {
        where.projectId = params.projectId;
      }
    } else if (!params.isGlobalAccess && params.companyId) {
      where.project = {
        companyId: params.companyId,
      };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  async create(data: unknown): Promise<unknown> {
    const { responsibleIds, ...siteData } = data;

    return prisma.site.create({
      data: {
        ...siteData,
        ...(responsibleIds &&
          responsibleIds.length > 0 && {
            responsibles: {
              createMany: {
                data: responsibleIds.map((userId: string) => ({ userId })),
              },
            },
          }),
      },
      include: {
        project: { select: { id: true, name: true } },
        responsibles: { select: { userId: true } },
      },
    });
  }

  async count(where: unknown): Promise<number> {
    return prisma.site.count({ where });
  }

  async findById(id: string): Promise<any | null> {
    return prisma.site.findUnique({
      where: { id },
      include: {
        project: { include: { company: { select: { id: true, name: true } } } },
        teams: {
          include: { supervisor: { select: { id: true, name: true } } },
        },
        userAffiliations: {
          take: 10 /* literal */,
          include: { user: { select: { id: true, name: true } } },
        },
        _count: {
          select: { userAffiliations: true, teams: true, workStages: true },
        },
      },
    });
  }

  async update(id: string, data: unknown): Promise<unknown> {
    const { responsibleIds, ...siteData } = data;

    // If responsibleIds is provided, sync the many-to-many relation
    if (responsibleIds !== undefined) {
      // Delete existing responsibles and create new ones
      await prisma.siteResponsible.deleteMany({ where: { siteId: id } });

      if (responsibleIds.length > 0) {
        await prisma.siteResponsible.createMany({
          data: responsibleIds.map((userId: string) => ({
            siteId: id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return prisma.site.update({
      where: { id },
      data: siteData,
      include: {
        project: { select: { id: true, name: true } },
        responsibles: { select: { userId: true } },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.site.delete({
      where: { id },
    });
  }
}
