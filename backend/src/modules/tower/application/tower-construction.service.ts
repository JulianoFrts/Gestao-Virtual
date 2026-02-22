import {
  TowerConstructionData,
  TowerConstructionRepository,
} from "../domain/tower-construction.repository";
import { logger } from "@/lib/utils/logger";

export class TowerConstructionService {
  constructor(private readonly repository: TowerConstructionRepository) {}

  async importProjectData(
    projectId: string,
    companyId: string,
    data: any[],
  ): Promise<any> {
    logger.info(
      `[TowerConstructionService] Importing project data for ${data.length} towers`,
    );

    const elements: TowerConstructionData[] = data.map((item) => ({
      projectId,
      companyId,
      towerId: String(item.towerId),
      metadata: {
        distancia_vao: Number(item.vao || 0),
        elevacao: Number(item.elevacao || 0),
        latitude: Number(item.lat || 0),
        longitude: Number(item.lng || 0),
        zona: item.zona || "",
        peso_estrutura: Number(item.pesoEstrutura || 0),
        peso_concreto: Number(item.pesoConcreto || 0),
        peso_escavacao: Number(item.pesoEscavacao || 0),
        peso_aco_1: Number(item.pesoAco1 || 0),
        peso_aco_2: Number(item.pesoAco2 || 0),
        peso_aco_3: Number(item.pesoAco3 || 0),
        ...item.metadata,
      },
    }));

    const saved = await this.repository.saveMany(elements);
    return { imported: saved.length, total: data.length };
  }

  async getProjectData(projectId: string): Promise<TowerConstructionData[]> {
    return this.repository.findByProject(projectId);
  }
}
