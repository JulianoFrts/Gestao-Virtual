export interface DelayCostConfig {
  companyId: string;
  projectId: string;
  dailyCost: any;
  currency: string;
  description?: string | null;
  updatedById?: string | null;
}

export interface ProductionConfigRepository {
  getDelayCostConfig(
    companyId: string,
    projectId: string,
  ): Promise<DelayCostConfig | null>;
  upsertDelayCostConfig(data: DelayCostConfig): Promise<DelayCostConfig>;

  // Outras configurações de delay reasons, categorias e atividades poderiam vir para cá também
  listDelayReasons(projectId: string): Promise<any[]>;
  createDelayReason(data: any): Promise<any>;
  deleteDelayReason(id: string): Promise<void>;

  listCategories(): Promise<any[]>;
  createCategory(data: any): Promise<any>;

  listActivities(categoryId?: string): Promise<any[]>;
  createActivity(data: any): Promise<any>;

  listUnitCosts(projectId: string): Promise<any[]>;
  upsertUnitCosts(projectId: string, costs: any[]): Promise<any>;
}
