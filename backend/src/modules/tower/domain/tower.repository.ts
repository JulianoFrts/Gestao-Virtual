export interface Tower {
  id?: string;
  projectId?: string;
  companyId?: string;
  objectId: string;
  objectSeq?: number;
  towerType?: string;
  objectHeight?: number;
  objectElevation?: number;
  xCoordinate?: number;
  yCoordinate?: number;
  deflection?: string;
  goForward?: number;
  fusoObject?: string;
  fixConductor?: string;
  trecho?: string;
  technicalKm?: number;
  technicalIndex?: number;
  circuitId?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TowerRepository {
  save(tower: Tower): Promise<Tower>;
  saveMany(towers: Tower[]): Promise<Tower[]>;
  findById(id: string): Promise<Tower | null>;
  findByObjectId(projectId: string, objectId: string): Promise<Tower | null>;
  findByProject(projectId: string): Promise<Tower[]>;
  deleteByProject(projectId: string): Promise<number>;
  delete(id: string): Promise<boolean>;
}
