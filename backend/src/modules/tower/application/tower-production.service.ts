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
        ...element.metadata,
      },
    }));

    const saved = await this.repository.saveMany(elements);
    return { imported: saved.length, total: data.length };
  }

  async getTowers(projectId: string): Promise<TowerProductionData[]> {
    return this.repository.findByProject(projectId);
  }

  async deleteTower(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
