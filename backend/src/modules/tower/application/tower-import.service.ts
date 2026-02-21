import { MapElementRepository, MapElementTechnicalData } from "@/modules/map-elements/domain/map-element.repository";
import { logger } from "@/lib/utils/logger";

export interface TowerImportItem {
  number: string;
  trecho?: string;
  towerType?: string;
  foundationType?: string;
  concreteVolume?: number;
  steelWeight?: number;
  structureWeight?: number;
  spanLength?: number;
  sequence?: number;
  lat?: number;
  lng?: number;
  alt?: number;
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
    data: TowerImportItem[]
  ): Promise<ImportResults> {
    const results: ImportResults = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [],
    };

    logger.info(`[TowerImportService] Iniciando processamento de ${data.length} torres para o projeto ${projectId}`);

    const elements: MapElementTechnicalData[] = data.map((item, index) => {
      // Mapeamento de campos para o formato do repositório
      return {
        projectId,
        companyId,
        siteId: "", // Será preenchido pelo enrichment se necessário ou deixado vazio se for nível projeto
        externalId: String(item.number),
        name: `Torre ${item.number}`,
        elementType: "TOWER",
        sequence: item.sequence || index + 1,
        latitude: item.lat || null,
        longitude: item.lng || null,
        elevation: item.alt || null,
        metadata: {
          trecho: item.trecho || "",
          tower_type: item.towerType || "Autoportante",
          tipo_fundacao: item.foundationType || "",
          total_concreto: Number(item.concreteVolume) || 0,
          peso_armacao: Number(item.steelWeight) || 0,
          peso_estrutura: Number(item.structureWeight) || 0,
          go_forward: Number(item.spanLength) || 0,
          description: `Importado via Job em ${new Date().toLocaleDateString()}`
        }
      };
    });

    try {
      // O repositório já lidará com Upsert (verifica externalId) e batch insertion
      const saved = await this.repository.saveMany(elements);
      results.imported = saved.length;
      logger.info(`[TowerImportService] Sucesso: ${saved.length} torres processadas.`);
    } catch (error: any) {
      logger.error(`[TowerImportService] Erro fatal no processamento do lote`, { error: error.message });
      results.failed = data.length;
      results.errors.push({
        item: "Batch Process",
        error: error.message || "Erro desconhecido na persistência do lote"
      });
    }

    return results;
  }
}
