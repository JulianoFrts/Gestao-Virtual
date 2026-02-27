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

export interface TowerImportItem {
  towerId: string | number;
  sequencia?: number | string;
  vao?: number | string;
  elevacao?: number | string;
  lat?: number | string;
  lng?: number | string;
  zona?: string;
  pesoEstrutura?: number | string;
  pesoConcreto?: number | string;
  pesoEscavacao?: number | string;
  aco1?: number | string;
  aco2?: number | string;
  aco3?: number | string;
  metadata?: Record<string, unknown>;
}

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
    data: TowerImportItem[],
  ): Promise<{ imported: number; total: number }> {
    if (!projectId || projectId === "all") {
      throw new Error("Project ID is required and cannot be 'all'");
    }

    if (!companyId || companyId === "all") {
      throw new Error("Company ID is required and cannot be 'all'");
    }

    logger.info(
      `[TowerConstructionService] Importing project data for ${data.length} towers`,
    );

    // 1. Montar dados de Construção (Dados Técnicos)
    const elements: TowerConstructionData[] = data.map((entry) => ({
      projectId,
      companyId,
      towerId: String(entry.towerId),
      sequencia: Number(entry.sequencia || 0),
      metadata: {
        distancia_vao: Number(entry.vao || 0),
        elevacao: Number(entry.elevacao || 0),
        latitude: Number(entry.lat || 0),
        longitude: Number(entry.lng || 0),
        zona: entry.zona || "",
        peso_estrutura: Number(entry.pesoEstrutura || 0),
        peso_concreto: Number(entry.pesoConcreto || 0),
        peso_escavacao: Number(entry.pesoEscavacao || 0),
        peso_aco_1: Number(entry.aco1 || 0),
        peso_aco_2: Number(entry.aco2 || 0),
        peso_aco_3: Number(entry.aco3 || 0),
        ...entry.metadata,
      },
    }));

    const saved = await this.repository.saveMany(elements);

    // 2. Auto-provisionar torres NOVAS na tabela de Produção
    // NÃO sobrescrever registros existentes para preservar dados de produção (ex: towerType/TextoTorre)
    if (this.productionRepository) {
      const existingTowers = await prisma.towerProduction.findMany({
        where: {
          projectId,
          towerId: { in: data.map((d) => String(d.towerId)) },
        },
        select: { towerId: true },
      });
      const existingSet = new Set(
        existingTowers.map((t: { towerId: string }) => t.towerId),
      );

      const newTowers = data.filter(
        (element) => !existingSet.has(String(element.towerId)),
      );

      // Etapa 2a: Criar torres NOVAS na Produção
      if (newTowers.length > 0) {
        try {
          logger.info(
            `[TowerConstructionService] Auto-provisioning ${newTowers.length} NEW towers in Production (skipping ${existingSet.size} existing)`,
          );

          const productionElements: TowerProductionData[] = newTowers.map(
            (element) => ({
              projectId,
              companyId,
              towerId: String(element.towerId),
              sequencia: Number(element.sequencia || 0),
              metadata: {
                trecho: "",
                towerType: "Autoportante",
                // Já incluir dados técnicos nas novas torres
                goForward: Number(element.vao || 0),
                pesoEstrutura: Number(element.pesoEstrutura || 0),
                totalConcreto: Number(element.pesoConcreto || 0),
                pesoArmacao: Number(element.aco1 || 0),
                latitude: Number(element.lat || 0),
                longitude: Number(element.lng || 0),
                elevacao: Number(element.elevacao || 0),
              },
            }),
          );

          await this.productionRepository.saveMany(productionElements);
          logger.info(
            `[TowerConstructionService] Production auto-provision complete`,
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(
            `[TowerConstructionService] Production auto-provision failed: ${message}`,
          );
          // NÃO interromper — a importação de dados técnicos já foi salva com sucesso
        }
      } else {
        logger.info(
          `[TowerConstructionService] All ${data.length} towers already exist in Production, skipping auto-provision`,
        );
      }

      // Etapa 2b: Sincronizar dados técnicos para torres EXISTENTES
      // Isso garante que campos como vão, peso, concreto sejam atualizados na Produção
      const existingTowerItems = data.filter((entry) =>
        existingSet.has(String(entry.towerId)),
      );

      if (
        existingTowerItems.length > 0 &&
        "syncTechnicalData" in this.productionRepository
      ) {
        try {
          logger.info(
            `[TowerConstructionService] Syncing technical data for ${existingTowerItems.length} existing towers`,
          );

          const updates = existingTowerItems.map((entry) => ({
            towerId: String(entry.towerId),
            technicalMetadata: {
              sequencia: Number(entry.sequencia || 0),
              distancia_vao: Number(entry.vao || 0),
              elevacao: Number(entry.elevacao || 0),
              latitude: Number(entry.lat || 0),
              longitude: Number(entry.lng || 0),
              peso_estrutura: Number(entry.pesoEstrutura || 0),
              peso_concreto: Number(entry.pesoConcreto || 0),
              peso_aco_1: Number(entry.aco1 || 0),
            },
          }));

          const syncedCount = await this.productionRepository.syncTechnicalData(
            projectId,
            updates,
          );
          logger.info(
            `[TowerConstructionService] Technical data synced for ${syncedCount} towers`,
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(
            `[TowerConstructionService] Technical data sync failed: ${message}`,
          );
          // NÃO interromper — a importação de dados técnicos já foi salva com sucesso
        }
      }
    }

    return { imported: saved.length, total: data.length };
  }

  async getProjectData(projectId: string): Promise<TowerConstructionData[]> {
    return this.repository.findByProject(projectId);
  }
}
