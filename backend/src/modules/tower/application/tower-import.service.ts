import {
  MapElementRepository,
  MapElementTechnicalData,
} from "@/modules/map-elements/domain/map-element.repository";
import { logger } from "@/lib/utils/logger";

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
  constructor(private readonly repository: MapElementRepository) {}

  /**
   * Processa uma lista de torres para importação/atualização
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
      `[TowerImportService] Iniciando processamento de ${data.length} torres para o projeto ${projectId}`,
    );

    const elements: MapElementTechnicalData[] = data.map((item, index) => {
      // Normalização de campos com fallback para suporte legado e premium
      const towerNumber = item.externalId || item.number || "";
      const concrete = item.totalConcreto ?? item.concreteVolume ?? 0;
      const steel = item.pesoArmacao ?? item.steelWeight ?? 0;
      const structure = item.pesoEstrutura ?? item.structureWeight ?? 0;
      const span = item.goForward ?? item.spanLength ?? 0;
      const seq = item.objectSeq ?? item.sequence ?? index + 1;

      return {
        projectId,
        companyId,
        siteId:
          item.siteId || defaultSiteId
            ? String(item.siteId || defaultSiteId)
            : null,
        externalId: String(towerNumber),
        name: `Torre ${towerNumber}`,
        elementType: "TOWER",
        sequence: seq,
        latitude: item.lat || null,
        longitude: item.lng || null,
        elevation: item.alt || null,
        metadata: {
          trecho: item.trecho || "",
          tower_type: item.towerType || "Autoportante",
          tipo_fundacao: item.foundationType || "",
          total_concreto: Number(concrete),
          peso_armacao: Number(steel),
          peso_estrutura: Number(structure),
          go_forward: Number(span),
          tramo_lancamento: item.tramoLancamento || "",
          tipificacao_estrutura: item.tipificacaoEstrutura || "",
          description: `Importado via Job em ${new Date().toLocaleDateString()}`,
        },
      };
    });

    try {
      // O repositório já lidará com Upsert (verifica externalId) e batch insertion
      const saved = await this.repository.saveMany(elements);
      results.imported = saved.length;
      logger.info(
        `[TowerImportService] Sucesso: ${saved.length} torres processadas.`,
      );
    } catch (error: any) {
      logger.error(`[TowerImportService] Erro fatal no processamento do lote`, {
        error: error.message,
      });
      results.failed = data.length;
      results.errors.push({
        item: "Batch Process",
        error: error.message || "Erro desconhecido na persistência do lote",
      });
    }

    return results;
  }
}
