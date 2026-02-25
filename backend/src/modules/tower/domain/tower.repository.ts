export interface TowerBase {
  id?: string;
  projectId?: string;
  companyId?: string;
  objectId: string;
  objectSeq?: number;
  towerType?: string;
  trecho?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TowerGeography {
  xCoordinate?: number;
  yCoordinate?: number;
  objectElevation?: number;
  deflection?: string;
  goForward?: number;
  fusoObject?: string;
  technicalKm?: number;
  technicalIndex?: number;
}

export interface TowerStructural {
  objectHeight?: number;
  fixConductor?: string;
  circuitId?: string;
}

export interface Tower extends TowerBase, TowerGeography, TowerStructural {}

export interface TowerRepository {
  save(tower: Tower): Promise<Tower>;
  saveMany(towers: Tower[]): Promise<Tower[]>;
  findById(id: string): Promise<Tower | null>;
  findByObjectId(projectId: string, objectId: string): Promise<Tower | null>;
  findByProject(projectId: string): Promise<Tower[]>;
  deleteByProject(projectId: string): Promise<number>;
  delete(id: string): Promise<boolean>;
}
