export interface ProductionCatalogueRepository {
  listCategories(): Promise<any[]>;
  createCategory(data: any): Promise<any>;
  listActivities(categoryId?: string): Promise<any[]>;
  createActivity(data: any): Promise<any>;
  findAllIAPs(): Promise<any[]>;
  listUnitCosts(projectId: string): Promise<any[]>;
  upsertUnitCosts(projectId: string, costs: any[]): Promise<any>;
}
