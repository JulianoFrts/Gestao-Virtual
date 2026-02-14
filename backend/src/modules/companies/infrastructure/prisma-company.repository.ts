import { prisma } from "@/lib/prisma/client";
import {
  CompanyRepository,
  CompanyListResult,
} from "../domain/company.repository";

export class PrismaCompanyRepository implements CompanyRepository {
  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  }): Promise<CompanyListResult> {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(params);

    const [items, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.company.count({ where }),
    ]);

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

  private buildWhereClause(params: {
    search?: string;
    isActive?: boolean;
  }): any {
    const where: any = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { taxId: { contains: params.search } },
      ];
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    // Hide "Empresa Padrão" by default
    where.AND = [
      { OR: [{ taxId: { not: "00000000000000" } }, { taxId: null }] },
    ];

    return where;
  }

  async findById(id: string): Promise<any | null> {
    return prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { projects: true, userAffiliations: true } },
      },
    });
  }

  async findByTaxId(taxId: string): Promise<any | null> {
    return prisma.company.findUnique({
      where: { taxId },
    });
  }

  async create(data: any): Promise<any> {
    return prisma.company.create({ data });
  }

  async update(id: string, data: any): Promise<any> {
    return prisma.company.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.company.delete({ where: { id } });
  }
}
