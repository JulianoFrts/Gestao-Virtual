export interface TowerIdentification {
  id?: string;
  projectId?: string;
  companyId?: string;
  objectId: string;
  objectSeq?: number;
}

export interface TowerTechnical {
  towerType?: string;
  objectHeight?: number;
  fixConductor?: string;
  circuitId?: string;
  trecho?: string;
}

export interface TowerGeospatial {
  objectElevation?: number;
  xCoordinate?: number;
  yCoordinate?: number;
  deflection?: string;
  goForward?: number;
  fusoObject?: string;
  technicalKm?: number;
  technicalIndex?: number;
}

export interface TowerSystem {
  metadata?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Tower extends TowerIdentification, TowerTechnical, TowerGeospatial, TowerSystem {}

export interface TowerRepository {
  save(tower: Tower): Promise<Tower>;
  saveMany(towers: Tower[]): Promise<Tower[]>;
  findById(id: string): Promise<Tower | null>;
  findByObjectId(projectId: string, objectId: string): Promise<Tower | null>;
  findByProject(projectId: string): Promise<Tower[]>;
  deleteByProject(projectId: string): Promise<number>;
  delete(id: string): Promise<boolean>;
}
