import {
  TowerConstructionData,
  TowerConstructionRepository,
} from "../domain/tower-construction.repository";
import {
  TowerProductionData,
  TowerProductionRepository,
} from "../domain/tower-production.repository";
import { logger } from "@/lib/utils/logger";
import { prisma } from "@/lib/prisma/client";

export class TowerConstructionService {
  constructor(
    private readonly repository: TowerConstructionRepository,
    private readonly productionRepository?: TowerProductionRepository,
  ) {}

  /**
   * Importa dados técnicos de projeto E provisiona automaticamente
   * as torres na tabela de Produção (source of truth).
   */
  async importProjectData(
    projectId: string,
    companyId: string,
    data: any[],
  ): Promise<any> {
    logger.info(
      `[TowerConstructionService] Importing project data for ${data.length} towers`,
    );

    // 1. Montar dados de Construção (Dados Técnicos)
    const elements: TowerConstructionData[] = data.map((item) => ({
      projectId,
      companyId,
      towerId: String(item.towerId),
      sequencia: Number(item.sequencia || 0),
      metadata: {
        distancia_vao: Number(item.vao || 0),
        elevacao: Number(item.elevacao || 0),
        latitude: Number(item.lat || 0),
        longitude: Number(item.lng || 0),
        zona: item.zona || "",
        peso_estrutura: Number(item.pesoEstrutura || 0),
        peso_concreto: Number(item.pesoConcreto || 0),
        peso_escavacao: Number(item.pesoEscavacao || 0),
        peso_aco_1: Number(item.aco1 || 0),
        peso_aco_2: Number(item.aco2 || 0),
        peso_aco_3: Number(item.aco3 || 0),
        ...item.metadata,
      },
    }));

    const saved = await this.repository.saveMany(elements);

    // 2. Auto-provisionar torres na tabela de Produção APENAS se não existirem
    // NÃO sobrescrever registros existentes para preservar dados de produção (ex: towerType/TextoTorre)
    if (this.productionRepository) {
      const existingTowers = await prisma.towerProduction.findMany({
        where: {
          projectId,
          towerId: { in: data.map((d: any) => String(d.towerId)) },
        },
        select: { towerId: true },
      });
      const existingSet = new Set(existingTowers.map((t: any) => t.towerId));

      const newTowers = data.filter(
        (item: any) => !existingSet.has(String(item.towerId)),
      );

      if (newTowers.length > 0) {
        logger.info(
          `[TowerConstructionService] Auto-provisioning ${newTowers.length} NEW towers in Production (skipping ${existingSet.size} existing)`,
        );

        const productionElements: TowerProductionData[] = newTowers.map(
          (item: any) => ({
            projectId,
            companyId,
            towerId: String(item.towerId),
            sequencia: Number(item.sequencia || 0),
            metadata: {
              trecho: "",
              towerType: "Autoportante",
            },
          }),
        );

        try {
          await this.productionRepository.saveMany(productionElements);
          logger.info(
            `[TowerConstructionService] Production auto-provision complete`,
          );
        } catch (err: any) {
          logger.error(
            `[TowerConstructionService] Production auto-provision failed: ${err.message}`,
          );
        }
      } else {
        logger.info(
          `[TowerConstructionService] All ${data.length} towers already exist in Production, skipping auto-provision`,
        );
      }
    }

    return { imported: saved.length, total: data.length };
  }

  async getProjectData(projectId: string): Promise<TowerConstructionData[]> {
    return this.repository.findByProject(projectId);
  }
}
