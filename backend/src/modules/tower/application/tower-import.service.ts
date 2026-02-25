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
    if (!projectId || projectId === "all") {
      throw new Error("Project ID is required and cannot be 'all'");
    }

    if (!companyId || companyId === "all") {
      throw new Error("Company ID is required and cannot be 'all'");
    }

    const results: ImportResults = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [],
    };

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
            // Campos Técnicos para o Grid de Produção
            goForward: item.goForward ?? 0,
            totalConcreto: item.totalConcreto ?? 0,
            pesoArmacao: item.pesoArmacao ?? 0,
            pesoEstrutura: item.pesoEstrutura ?? 0,
          },
        };
      });

      // NOTA: Dados técnicos (TowerConstruction) NÃO são escritos aqui.
      // Eles vêm exclusivamente do import de Dados Técnicos (ConstructionImportModal).

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
      // NOTA: NÃO escrevemos em TowerConstruction aqui!
      // Dados técnicos (vao, lat, lng, peso, aco) vêm APENAS do import de Dados Técnicos.
      // O import de Produção só escreve em TowerProduction + MapElementTechnicalData (skeleton).
      await Promise.all([
        this.productionService.importTowers(
          projectId,
          companyId,
          siteId,
          productionData,
        ),
        // Removido importação automática de metas individuais para evitar poluir a EAP
        // this.activityService.importGoals(projectId, companyId, activityData),
        this.mapElementRepository.saveMany(skeletonData as any),
      ]);

      results.imported = data.length;
    } catch (error: any) {
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
