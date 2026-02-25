import { prisma, ExtendedPrismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export abstract class PrismaBaseRepository<
  TEntity,
  TCreateDTO,
  TUpdateDTO,
  TFiltersDTO,
> {
  protected prisma: ExtendedPrismaClient;
  protected abstract model: any;

  constructor(prismaInstance?: ExtendedPrismaClient) {
    this.prisma = (prismaInstance || prisma) as ExtendedPrismaClient;
  }

  async findAll(params: {
    where?: TFiltersDTO;
    skip?: number;
    take?: number;
    orderBy?: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TEntity[]> {
    return this.model.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      select: params.select,
      include: params.include,
    }) as Promise<TEntity[]>;
  }

  async count(where?: TFiltersDTO): Promise<number> {
    return this.model.count({ where });
  }

  async findById(
    id: string,
    options?: {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    },
  ): Promise<TEntity | null> {
    return this.model.findUnique({
      where: { id },
      select: options?.select,
      include: options?.include,
    }) as Promise<TEntity | null>;
  }

  async create(
    data: TCreateDTO,
    options?: {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    },
  ): Promise<TEntity> {
    return this.model.create({
      data: data as any,
      select: options?.select,
      include: options?.include,
    }) as Promise<TEntity>;
  }

  async update(
    id: string,
    data: TUpdateDTO,
    options?: {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    },
  ): Promise<TEntity> {
    return this.model.update({
      where: { id },
      data: data as any,
      select: options?.select,
      include: options?.include,
    }) as Promise<TEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({
      where: { id },
    });
  }
}
