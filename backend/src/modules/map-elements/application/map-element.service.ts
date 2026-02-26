import {
  MapElementTechnicalData,
  MapElementRepository,
  MapElementType,
} from "../domain/map-element.repository";

export class MapElementService {
  constructor(private readonly repository: MapElementRepository) { }

  async getElements(
    projectId: string,
    companyId?: string,
    type?: MapElementType,
  ): Promise<MapElementTechnicalData[]> {
    return this.repository.findByProject(projectId, companyId, type);
  }

  async getElementsByCompany(
    companyId: string,
    type?: MapElementType,
  ): Promise<MapElementTechnicalData[]> {
    return this.repository.findByCompany(companyId, type);
  }

  async getAllElements(
    type?: MapElementType,
    limit?: number,
  ): Promise<MapElementTechnicalData[]> {
    return this.repository.findAll(type, limit);
  }

  async saveElement(
    element: MapElementTechnicalData,
  ): Promise<MapElementTechnicalData> {
    await this.enrichElement(element);
    return this.repository.save(element);
  }

  async saveBatch(
    elements: MapElementTechnicalData[],
  ): Promise<MapElementTechnicalData[]> {
    try {
      await Promise.all(elements.map((e) => this.enrichElement(e)));
      return await this.repository.saveMany(elements);
    } catch (error: unknown) {
      console.error("[MapElementService] Error saving batch:", error);
      throw error;
    }
  }

  private async enrichElement(element: unknown) {
    // 1. Map legacy/frontend fields
    this.mapOriginalFields(element);

    // 2. Fetch companyId from project if missing
    if (!element.companyId && element.projectId) {
      const companyId = await this.repository.getProjectCompanyId(
        element.projectId,
      );
      if (companyId) {
        element.companyId = companyId;
      }
    }

    // 3. Final validation and mapping
    this.finalizeEnrichment(element);
  }

  private mapOriginalFields(element: unknown) {
    if (!element.elementType) {
      element.elementType =
        element.tower_type || (element.object_id && !element.tower_start_id)
          ? "TOWER"
          : element.tower_start_id
            ? "SPAN"
            : "TOWER";
    }

    if (!element.externalId) {
      if (element.object_id) element.externalId = String(element.object_id);
      else if (element.NumeroTorre) element.externalId = String(element.NumeroTorre);
      else if (element.numero_torre) element.externalId = String(element.numero_torre);
    }

    if (!element.projectId && element.project_id)
      element.projectId = element.project_id;
    if (!element.companyId && element.company_id)
      element.companyId = element.company_id;

    // Se ainda não tem projectId e companyId, tenta pegar do metadata se houver logic de importação
    if (!element.projectId && element.metadata?.projectId) element.projectId = element.metadata.projectId;

    if (element.sequence === undefined || element.sequence === 0) {
      if (element.object_seq !== undefined)
        element.sequence = Number(element.object_seq);
      else if (element.Sequencia)
        element.sequence = Number(element.Sequencia);
    }

    if (element.latitude === undefined || element.latitude === null) {
      element.latitude =
        element.y_coordinate ?? element.y_cord_object ?? element.lat;
    }
    if (element.longitude === undefined || element.longitude === null) {
      element.longitude =
        element.x_coordinate ?? element.x_cord_object ?? element.lng;
    }

    if (element.elevation === undefined || element.elevation === null) {
      element.elevation =
        element.object_elevation ?? element.elevation_object ?? element.alt;
    }

    if (!element.metadata) element.metadata = {};
    if (typeof element.metadata === "string") {
      try {
        element.metadata = JSON.parse(element.metadata);
      } catch {
        element.metadata = {};
      }
    }

    const technicalFields = [
      "tower_start_id",
      "tower_end_id",
      "voltage_kv",
      "cable_type",
      "catenary_constant",
      "tower_type",
      "object_height",
      "go_forward",
      "deflection",
      "fix_conductor",
      "fix_pararaio",
      "tipificacao_estrutura",
      "is_hidden",
      "distance",
      "weight",
      "tipo_fundacao",
      "total_concreto",
      "peso_armacao",
      "peso_estrutura",
      "tramo_lancamento",
      "trecho",
    ];

    technicalFields.forEach((field) => {
      if (element[field] !== undefined) {
        element.metadata[field] = element[field];
      }
    });

    if (!element.name && (element.object_id || element.span_name)) {
      element.name = element.object_id || element.span_name;
    }
  }

  private finalizeEnrichment(element: unknown) {
    const modelFields = [
      "id",
      "companyId",
      "projectId",
      "documentId",
      "elementType",
      "externalId",
      "name",
      "description",
      "sequence",
      "latitude",
      "longitude",
      "elevation",
      "path",
      "geometry",
      "metadata",
      "displaySettings",
    ];

    Object.keys(element).forEach((key) => {
      if (!modelFields.includes(key)) {
        delete element[key];
      }
    });

    if (!element.externalId) element.externalId = element.name || "UNKNOWN";
    if (!element.projectId)
      throw new Error("projectId is required for map elements");
    if (!element.companyId)
      throw new Error("companyId is required for map elements");
  }

  async deleteElement(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async deleteElements(ids: string[]): Promise<number> {
    return this.repository.deleteMany(ids);
  }

  async clearProject(projectId: string): Promise<number> {
    return this.repository.deleteByProject(projectId);
  }
}
