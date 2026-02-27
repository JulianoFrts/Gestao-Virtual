export interface TowerIdentity {
  id?: string;
  projectId?: string;
  companyId?: string;
  objectId: string;
  objectSeq?: number;
  towerType?: string;
  trecho?: string;
}

export interface TowerGeography {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  deflection?: string;
  goForward?: number;
  fuso?: string;
  technicalKm?: number;
  technicalIndex?: number;
}

export interface TowerStructural {
  height?: number;
  concreteVolume?: number;
  steelWeight?: number;
  structureWeight?: number;
  foundationType?: string;
  fixConductor?: string;
  circuitId?: string;
}

export interface TowerGovernance {
  isHidden?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Tower extends TowerIdentity, TowerGeography, TowerStructural, TowerGovernance {}

export interface TowerRepository {
  save(tower: Tower): Promise<Tower>;
  saveMany(towers: Tower[]): Promise<Tower[]>;
  findById(id: string): Promise<Tower | null>;
  findByObjectId(projectId: string, objectId: string): Promise<Tower | null>;
  findByProject(projectId: string): Promise<Tower[]>;
  deleteByProject(projectId: string): Promise<number>;
  delete(id: string): Promise<boolean>;
}
