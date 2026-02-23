import { logger } from "@/lib/utils/logger";
import { TowerProductionService } from "./tower-production.service";
import { TowerConstructionService } from "./tower-construction.service";
import { TowerActivityService } from "./tower-activity.service";
import { MapElementRepository } from "@/modules/map-elements/domain/map-element.repository";

export interface TowerImportItem {
  number?: string;
  externalId?: string; // Suporte para o que vem do frontend
  trecho?: string;
  towerType?: string;
  foundationType?: string;
  concreteVolume?: number;
  totalConcreto?: number; // Suporte frontend
  steelWeight?: number;
  pesoArmacao?: number; // Suporte frontend
  structureWeight?: number;
  pesoEstrutura?: number; // Suporte frontend
  spanLength?: number;
  goForward?: number; // Suporte frontend
  sequence?: number;
  objectSeq?: number; // Suporte frontend
  tramoLancamento?: string; // Suporte frontend
  tipificacaoEstrutura?: string; // Suporte frontend
  lat?: number;
  lng?: number;
  alt?: number;
  siteId?: string; // Suporte para vinculação a canteiro
}

export interface ImportResults {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ item: string; error: string }>;
}

export class TowerImportService {
  constructor(
    private readonly productionService: TowerProductionService,
    private readonly constructionService: TowerConstructionService,
    private readonly activityService: TowerActivityService,
    private readonly mapElementRepository: MapElementRepository,
  ) {}

  /**
   * Processa uma lista de torres para importação/atualização
   * Distribuindo os dados entre as 3 tabelas especializadas.
   */
  async processImport(
    projectId: string,
    companyId: string,
    data: TowerImportItem[],
    defaultSiteId?: string | null,
  ): Promise<ImportResults> {
    const results: ImportResults = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [],
    };

    logger.info(
      `[TowerImportService] Iniciando processamento de ${data.length} torres nas 3 tabelas para o projeto ${projectId}`,
    );

    try {
      const siteId =
        defaultSiteId && defaultSiteId !== "none" ? defaultSiteId : null;

      // 1. Preparar dados para TowerProduction (Lista mestre)
      const productionData = data.map((item, index) => {
        const id = String(
          item.externalId || item.number || item.objectSeq || index + 1,
        );
        return {
          projectId,
          companyId,
          siteId,
          towerId: id,
          metadata: {
            trecho: item.trecho || "",
            towerType: item.towerType || "Autoportante",
            tramoLancamento: item.tramoLancamento || "",
            siteId: item.siteId || siteId,
          },
        };
      });

      // 2. Preparar dados para TowerConstruction (Dados técnicos)
      const constructionData = data.map((item, index) => {
        const id = String(
          item.externalId || item.number || item.objectSeq || index + 1,
        );
        return {
          projectId,
          companyId,
          siteId,
          towerId: id,
          metadata: {
            vao: item.goForward ?? item.spanLength ?? 0,
            elevacao: item.alt ?? 0,
            lat: item.lat ?? 0,
            lng: item.lng ?? 0,
            pesoEstrutura: item.pesoEstrutura ?? item.structureWeight ?? 0,
            pesoConcreto: item.totalConcreto ?? item.concreteVolume ?? 0,
            pesoAco1: item.pesoArmacao ?? item.steelWeight ?? 0,
            tipificacaoEstrutura: item.tipificacaoEstrutura || "",
            foundationType: item.foundationType || "",
          },
        };
      });

      // 4. Skeleton Sync (MapElementTechnicalData) para suporte a progresso legado
      const skeletonData = data.map((item, index) => {
        const id = String(
          item.externalId || item.number || item.objectSeq || index + 1,
        );
        return {
          projectId,
          companyId,
          siteId: item.siteId || siteId,
          externalId: id,
          name: `Torre ${id}`,
          elementType: "TOWER" as any,
          sequence: item.objectSeq ?? item.sequence ?? index + 1,
          metadata: {
            trecho: item.trecho || "",
            towerType: item.towerType || "Autoportante",
            tramoLancamento: item.tramoLancamento || "",
            tipoFundacao: item.foundationType || "",
            totalConcreto: item.totalConcreto ?? item.concreteVolume ?? 0,
            pesoArmacao: item.steelWeight ?? 0,
            pesoEstrutura: item.pesoEstrutura ?? 0,
            goForward: item.goForward ?? item.spanLength ?? 0,
            latitude: item.lat || 0,
            longitude: item.lng || 0,
            elevation: item.alt || 0,
            _legacy: true,
            importedAt: new Date().toISOString(),
          },
        };
      });

      // Executar importações em paralelo
      await Promise.all([
        this.productionService.importTowers(
          projectId,
          companyId,
          siteId,
          productionData,
        ),
        this.constructionService.importProjectData(
          projectId,
          companyId,
          constructionData,
        ),
        // Removido importação automática de metas individuais para evitar poluir a EAP
        // this.activityService.importGoals(projectId, companyId, activityData),
        this.mapElementRepository.saveMany(skeletonData as any),
      ]);

      results.imported = data.length;
      logger.info(
        `[TowerImportService] Sucesso: ${data.length} torres processadas nas 3 tabelas + Skeleton Sync.`,
      );
    } catch (error: any) {
      logger.error(
        `[TowerImportService] Erro fatal no processamento das 3 tabelas`,
        {
          error: error.message,
        },
      );
      results.failed = data.length;
      results.errors.push({
        item: "3-Table Batch Process",
        error:
          error.message || "Erro desconhecido na persistência das 3 tabelas",
      });
    }

    return results;
  }
}
