export interface ProductionCategory {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  activities?: ProductionActivity[];
}

export interface ProductionActivity {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  weight: number;
  order: number;
  productionCategory?: ProductionCategory;
}

export interface ProductionIAP {
  id: string;
  setor: string;
  peso: number;
  iap: number;
  cost: number;
  description?: string | null;
}

export interface ProductionUnitCost {
  id: string;
  projectId: string;
  activityId: string;
  unitPrice: number;
  measureUnit: string;
  activity?: ProductionActivity;
}

export interface ProductionCatalogueRepository {
  listCategories(): Promise<ProductionCategory[]>;
  createCategory(
    data: Partial<ProductionCategory>,
  ): Promise<ProductionCategory>;
  listActivities(categoryId?: string): Promise<ProductionActivity[]>;
  createActivity(
    data: Partial<ProductionActivity>,
  ): Promise<ProductionActivity>;
  findAllIAPs(): Promise<ProductionIAP[]>;
  listUnitCosts(projectId: string): Promise<ProductionUnitCost[]>;
  upsertUnitCosts(
    projectId: string,
    costs: Partial<ProductionUnitCost>[],
  ): Promise<{ success: boolean; count: number }>;
}
