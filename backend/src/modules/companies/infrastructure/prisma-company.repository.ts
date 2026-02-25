import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import {
  CompanyRepository,
  CompanyListResult,
} from "../domain/company.repository";
import {
  CompanyEntity,
  CreateCompanyDTO,
  UpdateCompanyDTO,
} from "../domain/company.dto";

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
      items: items as unknown as CompanyEntity[],
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
  }): Prisma.CompanyWhereInput {
    const where: Prisma.CompanyWhereInput = {};

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

  async findById(id: string): Promise<CompanyEntity | null> {
    return prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { projects: true, userAffiliations: true } },
      },
    }) as Promise<CompanyEntity | null>;
  }

  async findByTaxId(taxId: string): Promise<CompanyEntity | null> {
    return prisma.company.findUnique({
      where: { taxId },
    }) as Promise<CompanyEntity | null>;
  }

  async create(data: CreateCompanyDTO): Promise<CompanyEntity> {
    const createData = {
      name: data.name,
      taxId: data.taxId,
      address: data.address,
      phone: data.phone,
      logoUrl: data.logoUrl,
      isActive: data.isActive,
      metadata: (data.metadata || {}) as any,
    } as any;
    return prisma.company.create({
      data: createData,
    }) as Promise<CompanyEntity>;
  }

  async update(id: string, data: UpdateCompanyDTO): Promise<CompanyEntity> {
    const updateData = {
      name: data.name,
      taxId: data.taxId,
      address: data.address,
      phone: data.phone,
      logoUrl: data.logoUrl,
      isActive: data.isActive,
      metadata: data.metadata as any
    } as any;
    return prisma.company.update({
      where: { id },
      data: updateData,
    }) as Promise<CompanyEntity>;
  }

  async delete(id: string): Promise<void> {
    await prisma.company.delete({ where: { id } });
  }
}
