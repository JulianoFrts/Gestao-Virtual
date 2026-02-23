export interface TowerProductionData {
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

export interface TowerProductionRepository {
  save(data: TowerProductionData): Promise<TowerProductionData>;
  saveMany(data: TowerProductionData[]): Promise<TowerProductionData[]>;
  findById(id: string): Promise<TowerProductionData | null>;
  findByTowerId(
    projectId: string,
    towerId: string,
  ): Promise<TowerProductionData | null>;
  findByProject(projectId: string): Promise<TowerProductionData[]>;
  delete(id: string): Promise<boolean>;
}
