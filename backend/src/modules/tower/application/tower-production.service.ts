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
    data: any[],
  ): Promise<any> {
    logger.info(
      `[TowerProductionService] Importing ${data.length} towers for project ${projectId}`,
    );

    const elements: TowerProductionData[] = data.map((item, index) => ({
      projectId,
      companyId,
      siteId,
      towerId: String(item.towerId || item.externalId || index + 1),
      sequencia: Number(item.objectSeq || item.sequencia || 0),
      metadata: {
        trecho: item.trecho || "",
        towerType: item.towerType || "Autoportante",
        tipificacaoEstrutura: item.tipificacaoEstrutura || "",
        tramoLancamento: item.tramoLancamento || "",
        circuito: item.circuito || "",
        ...item.metadata,
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
