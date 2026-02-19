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

  listDelayReasons(projectId: string): Promise<any[]>;
  createDelayReason(data: any): Promise<any>;
  deleteDelayReason(id: string): Promise<void>;
}
