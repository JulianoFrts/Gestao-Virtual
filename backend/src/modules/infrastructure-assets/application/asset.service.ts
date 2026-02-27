import { PrismaAssetRepository } from "../infrastructure/prisma-asset.repository";
import {
  AssetEntity,
  CreateAssetDTO,
  UpdateAssetDTO,
  AssetFiltersDTO,
} from "./dtos/asset.dtos";
import { logger } from "@/lib/utils/logger";

export class AssetService {
  constructor(private readonly repository: PrismaAssetRepository) {}

  async listAssets(filters: AssetFiltersDTO): Promise<AssetEntity[]> {
    return this.repository.findForMap(filters);
  }

  async getAssetById(id: string): Promise<AssetEntity | null> {
    return this.repository.findById(id);
  }

  async syncAssetsFromImport(
    companyId: string,
    projectId: string,
    assets: CreateAssetDTO[],
  ): Promise<number> {
    logger.info(
      `[AssetService] Sincronizando ${assets.length} ativos para projeto ${projectId}`,
    );

    // Adiciona IDs contextuais se faltarem
    const preparedAssets = assets.map((a) => ({
      ...a,
      companyId,
      projectId,
    }));

    return this.repository.bulkUpsert(preparedAssets);
  }

  async updateAsset(id: string, data: UpdateAssetDTO): Promise<AssetEntity> {
    return this.repository.update(id, data);
  }

  async deleteAsset(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  async getConstructionData(projectId: string) {
    return this.repository.getConstructionData(projectId);
  }

  async provisionConstruction(
    projectId: string,
    companyId: string,
    towerIds: string[],
  ) {
    return this.repository.provisionConstruction(
      projectId,
      companyId,
      towerIds,
    );
  }

  async provisionConstructionWithData(
    projectId: string,
    companyId: string,
    items: Array<{
      towerId: string;
      sequencia: number;
      metadata: Record<string, unknown>;
    }>,
  ) {
    return this.repository.provisionConstructionWithData(
      projectId,
      companyId,
      items,
    );
  }
}
