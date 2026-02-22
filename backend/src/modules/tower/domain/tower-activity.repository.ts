export interface TowerActivityGoalData {
  id?: string;
  towerId?: string | null;
  companyId: string;
  projectId: string;
  siteId?: string | null;
  parentId?: string | null;
  name: string;
  description?: string | null;
  level: number;
  order: number;
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  children?: TowerActivityGoalData[];
}

export interface TowerActivityRepository {
  save(data: TowerActivityGoalData): Promise<TowerActivityGoalData>;
  saveMany(data: TowerActivityGoalData[]): Promise<TowerActivityGoalData[]>;
  findById(id: string): Promise<TowerActivityGoalData | null>;
  findByProject(projectId: string): Promise<TowerActivityGoalData[]>;
  findHierarchy(projectId: string): Promise<TowerActivityGoalData[]>;
  delete(id: string): Promise<boolean>;
  move(
    id: string,
    newParentId: string | null,
    newOrder: number,
  ): Promise<TowerActivityGoalData>;
}
