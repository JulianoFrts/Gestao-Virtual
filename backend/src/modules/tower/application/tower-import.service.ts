import { TowerProductionService } from "./tower-production.service";
import { TowerConstructionService } from "./tower-construction.service";
import { TowerActivityService } from "./tower-activity.service";
import { MapElementRepository } from "@/modules/map-elements/domain/map-element.repository";
import { TimeProvider, SystemTimeProvider } from "@/lib/utils/time-provider";

export interface TowerImportBasicInfo {
  number?: string;
  externalId?: string;
  sequence?: number;
  objectSeq?: number;
}

export interface TowerImportTechnicalInfo {
  trecho?: string;
  towerType?: string;
  foundationType?: string;
  concreteVolume?: number;
  totalConcreto?: number;
  steelWeight?: number;
  pesoArmacao?: number;
  structureWeight?: number;
  pesoEstrutura?: number;
  spanLength?: number;
  goForward?: number;
  tramoLancamento?: string;
  tipificacaoEstrutura?: string;
}

export interface TowerImportGeospatialInfo {
  lat?: number;
  lng?: number;
  alt?: number;
}

export interface TowerImportMetadata {
  siteId?: string;
}

export interface TowerImportItem 
  extends TowerImportBasicInfo, 
          TowerImportTechnicalInfo, 
          TowerImportGeospatialInfo, 
          TowerImportMetadata {}

export interface ImportResults {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ element: string; error: string }>;
}

export class TowerImportService {
  constructor(
    private readonly productionService: TowerProductionService,
    private readonly constructionService: TowerConstructionService,
    private readonly activityService: TowerActivityService,
    private readonly mapElementRepository: MapElementRepository,
    private readonly timeProvider: TimeProvider = new SystemTimeProvider(),
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
      const productionData = data.map((element, index) => {
        const id = String(
          element.externalId || element.number || element.objectSeq || index + 1,
        );
        return {
          projectId,
          companyId,
          siteId,
          towerId: id,
          metadata: {
            trecho: element.trecho || "",
            towerType: element.towerType || "Autoportante",
            tramoLancamento: element.tramoLancamento || "",
            siteId: element.siteId || siteId,
            // Campos Técnicos para o Grid de Produção
            goForward: element.goForward ?? 0,
            totalConcreto: element.totalConcreto ?? 0,
            pesoArmacao: element.pesoArmacao ?? 0,
            pesoEstrutura: element.pesoEstrutura ?? 0,
          },
        };
      });

      // NOTA: Dados técnicos (TowerConstruction) NÃO são escritos aqui.
      // Eles vêm exclusivamente do import de Dados Técnicos (ConstructionImportModal).

      // 4. Skeleton Sync (MapElementTechnicalData) para suporte a progresso legado
      const skeletonData = data.map((element, index) => {
        const id = String(
          element.externalId || element.number || element.objectSeq || index + 1,
        );
        return {
          projectId,
          companyId,
          siteId: element.siteId || siteId,
          externalId: id,
          name: `Torre ${id}`,
          elementType: "TOWER" as unknown,
          sequence: element.objectSeq ?? element.sequence ?? index + 1,
          metadata: {
            trecho: element.trecho || "",
            towerType: element.towerType || "Autoportante",
            tramoLancamento: element.tramoLancamento || "",
            tipoFundacao: element.foundationType || "",
            totalConcreto: element.totalConcreto ?? element.concreteVolume ?? 0,
            pesoArmacao: element.steelWeight ?? 0,
            pesoEstrutura: element.pesoEstrutura ?? 0,
            goForward: element.goForward ?? element.spanLength ?? 0,
            latitude: element.lat || 0,
            longitude: element.lng || 0,
            elevation: element.alt || 0,
            _legacy: true,
            importedAt: this.timeProvider.toISOString(),
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
        this.mapElementRepository.saveMany(skeletonData as unknown),
      ]);

      results.imported = data.length;
    } catch (error: unknown) {
      results.failed = data.length;
      results.errors.push({
        element: "3-Table Batch Process",
        error:
          error?.message || "Erro desconhecido na persistência das 3 tabelas",
      });
    }

    return results;
  }
}
