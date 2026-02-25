import { prisma, ExtendedPrismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { PrismaBaseRepository } from "../../common/infrastructure/prisma-base.repository";
import { 
  AssetEntity, 
  CreateAssetDTO, 
  UpdateAssetDTO, 
  AssetFiltersDTO 
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
    const where: Prisma.MapElementTechnicalDataWhereInput = {
      projectId: filters.projectId,
      siteId: filters.siteId,
      companyId: filters.companyId,
    };

    if (filters.elementType) {
      where.elementType = filters.elementType;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { externalId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.mapElementTechnicalData.findMany({
      where,
      orderBy: { sequence: 'asc' },
    }) as unknown as Promise<AssetEntity[]>;
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
          update: asset as any,
          create: asset as any,
        })
      )
    );
    return results.length;
  }

  /**
   * Provisiona torres para o módulo de construção
   */
  async provisionConstruction(projectId: string, companyId: string, towerIds: string[]): Promise<number> {
    const results = await this.prisma.$transaction(
      towerIds.map(tid => this.prisma.towerConstruction.upsert({
        where: { projectId_towerId: { projectId, towerId: tid } },
        update: { updatedAt: new Date() },
        create: { projectId, companyId, towerId: tid }
      }))
    );
    return results.length;
  }

  async getConstructionData(projectId: string) {
    return this.prisma.towerConstruction.findMany({
      where: { projectId },
      include: { 
        site: { select: { name: true } }
      }
    });
  }
}
