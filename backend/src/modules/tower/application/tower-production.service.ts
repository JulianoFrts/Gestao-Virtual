import {
  TowerProductionData,
  TowerProductionRepository,
} from "../domain/tower-production.repository";
import { logger } from "@/lib/utils/logger";

export class TowerProductionService {
  constructor(private readonly repository: TowerProductionRepository) {}

  async importTowers(
    projectId: string,
    companyId: string,
    siteId: string | null,
    data: Record<string, unknown>[],
  ): Promise<unknown> {
    logger.info(
      `[TowerProductionService] Importing ${data.length} towers for project ${projectId}`,
    );

    const elements: TowerProductionData[] = data.map((element, index) => ({
      projectId,
      companyId,
      siteId,
      towerId: String(element.towerId || element.externalId || index + 1),
      sequencia: Number(element.objectSeq || element.sequencia || 0),
      metadata: {
        trecho: element.trecho || "",
        towerType: element.towerType || "Autoportante",
        tipificacaoEstrutura: element.tipificacaoEstrutura || "",
        tramoLancamento: element.tramoLancamento || "",
        circuito: element.circuito || "",
        latitude: Number(element.latitude || 0),
        longitude: Number(element.longitude || 0),
        elevation: Number(element.elevation || 0),
        goForward: Number(element.goForward || 0),
        totalConcreto: Number(element.totalConcreto || 0),
        pesoArmacao: Number(element.pesoArmacao || 0),
        pesoEstrutura: Number(element.pesoEstrutura || 0),
        ...((element.metadata as any) || {}),
      },
    }));

    const saved = await this.repository.saveMany(elements);
    return { imported: saved.length, total: data.length };
  }

  async getTowers(projectId: string): Promise<TowerProductionData[]> {
    return this.repository.findByProject(projectId);
  }

  async updateTower(
    id: string,
    updates: Partial<TowerProductionData>,
  ): Promise<TowerProductionData> {
    logger.info(`[TowerProductionService] Updating tower ${id}`);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Tower with id ${id} not found`);
    }

    // Merge metadata if provided
    const metadata = updates.metadata
      ? {
          ...(existing.metadata as Record<string, unknown>),
          ...(updates.metadata as Record<string, unknown>),
        }
      : existing.metadata;

    const mergedData: TowerProductionData = {
      ...existing,
      ...updates,
      metadata,
    };

    return this.repository.save(mergedData);
  }

  async bulkUpdate(
    items: Array<{ id: string; updates: Partial<TowerProductionData> }>,
  ): Promise<TowerProductionData[]> {
    logger.info(`[TowerProductionService] Bulk updating ${items.length} towers`);

    const results: TowerProductionData[] = [];
    const elementsToUpdate: TowerProductionData[] = [];

    // Fetch and merge each item
    for (const item of items) {
      const existing = await this.repository.findById(item.id);
      if (existing) {
        const metadata = item.updates.metadata
          ? {
              ...(existing.metadata as Record<string, unknown>),
              ...(item.updates.metadata as Record<string, unknown>),
            }
          : existing.metadata;

        elementsToUpdate.push({
          ...existing,
          ...item.updates,
          metadata,
        });
      }
    }

    return this.repository.saveMany(elementsToUpdate);
  }

  async deleteTower(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
