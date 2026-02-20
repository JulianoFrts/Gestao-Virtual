export type MapElementType =
  | "TOWER"
  | "SPAN"
  | "CABLE"
  | "EQUIPMENT"
  | "STATION";

export interface MapElementTechnicalData {
  id?: string;
  companyId: string;
  siteId: string;
  projectId: string;
  documentId?: string | null;
  elementType: MapElementType;
  externalId: string;
  name?: string | null;
  description?: string | null;
  sequence: number;
  latitude?: number | null;
  longitude?: number | null;
  elevation?: number | null;
  path?: any | null;
  geometry?: any | null;
  metadata: Record<string, any>;
  displaySettings?: any;
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
