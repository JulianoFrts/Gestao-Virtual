export type MapElementType =
  | "TOWER"
  | "SPAN"
  | "CABLE"
  | "EQUIPMENT"
  | "STATION";

/** Dados de identificação e contexto do elemento */
export interface MapElementIdentity {
  id?: string;
  companyId: string;
  siteId: string | null;
  projectId: string;
  documentId?: string | null;
  elementType: MapElementType;
  externalId: string;
}

/** Dados espaciais e geográficos do elemento */
export interface MapElementGeospatial {
  sequence: number;
  latitude?: number | null;
  longitude?: number | null;
  elevation?: number | null;
  path?: unknown | null;
  geometry?: unknown | null;
}

/** Dados técnicos e metadados flexíveis */
export interface MapElementTechnicalData extends MapElementIdentity, MapElementGeospatial {
  name?: string | null;
  description?: string | null;
  metadata: Record<string, unknown>;
  displaySettings?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MapElementRepository {
  save(element: MapElementTechnicalData): Promise<MapElementTechnicalData>;
  saveMany(
    elements: MapElementTechnicalData[],
  ): Promise<MapElementTechnicalData[]>;
  findById(id: string): Promise<MapElementTechnicalData | null>;
  findByExternalId(
    projectId: string,
    externalId: string,
  ): Promise<MapElementTechnicalData | null>;
  findByProject(
    projectId: string,
    companyId?: string,
    type?: MapElementType,
  ): Promise<MapElementTechnicalData[]>;
  findByCompany(
    companyId: string,
    type?: MapElementType,
  ): Promise<MapElementTechnicalData[]>;
  findAll(
    type?: MapElementType,
    limit?: number,
  ): Promise<MapElementTechnicalData[]>;
  delete(id: string): Promise<boolean>;
  deleteMany(ids: string[]): Promise<number>;
  deleteByProject(projectId: string): Promise<number>;
  getProjectCompanyId(projectId: string): Promise<string | null>;
}
