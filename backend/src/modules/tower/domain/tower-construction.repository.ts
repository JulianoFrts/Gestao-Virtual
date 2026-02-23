export interface TowerConstructionData {
  id?: string;
  towerId: string;
  sequencia?: number;
  companyId: string;
  projectId: string;
  siteId?: string | null;
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TowerConstructionRepository {
  save(data: TowerConstructionData): Promise<TowerConstructionData>;
  saveMany(data: TowerConstructionData[]): Promise<TowerConstructionData[]>;
  findById(id: string): Promise<TowerConstructionData | null>;
  findByTowerId(
    projectId: string,
    towerId: string,
  ): Promise<TowerConstructionData | null>;
  findByProject(projectId: string): Promise<TowerConstructionData[]>;
  delete(id: string): Promise<boolean>;
}
