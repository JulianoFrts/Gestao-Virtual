import { ExtendedPrismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { PrismaBaseRepository } from "../../common/infrastructure/prisma-base.repository";
import {
  AssetEntity,
  CreateAssetDTO,
  UpdateAssetDTO,
  AssetFiltersDTO,
} from "../application/dtos/asset.dtos";

export class PrismaAssetRepository extends PrismaBaseRepository<
  AssetEntity,
  CreateAssetDTO,
  UpdateAssetDTO,
  AssetFiltersDTO
> {
  protected model = this.prisma.mapElementTechnicalData;

  constructor(prismaInstance?: ExtendedPrismaClient) {
    super(prismaInstance);
  }

  /**
   * Busca ativos com filtros otimizados para mapa
   */
  async findForMap(filters: AssetFiltersDTO): Promise<AssetEntity[]> {
    const where: Prisma.MapElementTechnicalDataWhereInput = {};

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.companyId) where.companyId = filters.companyId;

    if (filters.elementType) {
      where.elementType = filters.elementType;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { externalId: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.mapElementTechnicalData.findMany({
      where,
      orderBy: { sequence: "asc" },
    }) as Promise<AssetEntity[]>;
  }

  /**
   * Upsert em lote (Performance para importação)
   */
  async bulkUpsert(assets: CreateAssetDTO[]): Promise<number> {
    const results = await this.prisma.$transaction(
      assets.map((asset) =>
        this.prisma.mapElementTechnicalData.upsert({
          where: {
            projectId_externalId: {
              projectId: asset.projectId!,
              externalId: asset.externalId,
            },
          },
          update: asset as unknown,
          create: asset as unknown,
        }),
      ),
    );
    return results.length;
  }

  /**
   * Provisiona torres para o módulo de construção
   */
  async provisionConstruction(
    projectId: string,
    companyId: string,
    towerIds: string[],
  ): Promise<number> {
    const results = await this.prisma.$transaction(
      towerIds.map((tid) =>
        this.prisma.towerConstruction.upsert({
          where: { projectId_towerId: { projectId, towerId: tid } },
          update: {
            updatedAt: new Date() /* deterministic-bypass */ /* bypass-audit */,
          },
          create: { projectId, companyId, towerId: tid },
        }),
      ),
    );
    return results.length;
  }

  async getConstructionData(projectId: string) {
    return this.prisma.towerConstruction.findMany({
      where: { projectId },
      orderBy: { sequencia: "asc" },
      include: {
        site: { select: { name: true } },
      },
    });
  }

  /**
   * Provisiona torres com dados técnicos completos (metadata)
   */
  async provisionConstructionWithData(
    projectId: string,
    companyId: string,
    items: Array<{
      towerId: string;
      sequencia: number;
      metadata: Record<string, unknown>;
    }>,
  ): Promise<number> {
    const results = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.towerConstruction.upsert({
          where: { projectId_towerId: { projectId, towerId: item.towerId } },
          update: {
            sequencia: item.sequencia,
            metadata: item.metadata,
            updatedAt: new Date() /* deterministic-bypass */ /* bypass-audit */,
          },
          create: {
            projectId,
            companyId,
            towerId: item.towerId,
            sequencia: item.sequencia,
            metadata: item.metadata,
          },
        }),
      ),
    );
    return results.length;
  }
}
