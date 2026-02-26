import { prisma, ExtendedPrismaClient } from "@/lib/prisma/client";
// Prisma type is not directly used here, removing to fix lint

export abstract class PrismaBaseRepository<
  TEntity,
  TCreateDTO,
  TUpdateDTO,
  TFiltersDTO,
> {
  protected prisma: ExtendedPrismaClient;
  protected abstract model: unknown;

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
    options?:
      | {
          select?: Record<string, unknown>;
          include?: Record<string, unknown>;
        }
      | Record<string, unknown>,
  ): Promise<TEntity | null> {
    const finalOptions: Record<string, unknown> = { where: { id } };

    if (options) {
      if ("select" in options || "include" in options) {
        // Standard Options Object
        if (options.select) finalOptions.select = options.select;
        if (options.include) finalOptions.include = options.include;
      } else {
        // Direct Select Object
        finalOptions.select = options;
      }
    }

    return this.model.findUnique(finalOptions) as Promise<TEntity | null>;
  }

  async create(
    data: TCreateDTO,
    options?:
      | {
          select?: Record<string, unknown>;
          include?: Record<string, unknown>;
        }
      | Record<string, unknown>,
  ): Promise<TEntity> {
    const finalOptions: Record<string, unknown> = { data: data as unknown };

    if (options) {
      if ("select" in options || "include" in options) {
        if (options.select) finalOptions.select = options.select;
        if (options.include) finalOptions.include = options.include;
      } else {
        finalOptions.select = options;
      }
    }

    return this.model.create(finalOptions) as Promise<TEntity>;
  }

  async update(
    id: string,
    data: TUpdateDTO,
    options?:
      | {
          select?: Record<string, unknown>;
          include?: Record<string, unknown>;
        }
      | Record<string, unknown>,
  ): Promise<TEntity> {
    const finalOptions: Record<string, unknown> = {
      where: { id },
      data: data as unknown,
    };

    if (options) {
      if ("select" in options || "include" in options) {
        if (options.select) finalOptions.select = options.select;
        if (options.include) finalOptions.include = options.include;
      } else {
        finalOptions.select = options;
      }
    }

    return this.model.update(finalOptions) as Promise<TEntity>;
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({
      where: { id },
    });
  }
}
