import {
  ProductionConfigRepository,
  DelayCostConfig,
} from "../domain/production-config.repository";

export class ProductionConfigService {
  constructor(private readonly repository: ProductionConfigRepository) { }

  // ==========================================
  // DELAY COST
  // ==========================================

  async getDelayCostConfig(companyId: string, projectId: string) {
    return this.repository.getDelayCostConfig(companyId, projectId);
  }

  async upsertDelayCostConfig(data: DelayCostConfig) {
    return this.repository.upsertDelayCostConfig(data);
  }

  // ==========================================
  // DELAY REASONS
  // ==========================================

  async listDelayReasons(projectId: string) {
    return this.repository.listDelayReasons(projectId);
  }

  async createDelayReason(data: {
    projectId: string;
    code: string;
    description: string;
    dailyCost: number;
    category: string;
    updatedById: string;
  }) {
    if (data.projectId === "all") {
      throw new Error(
        'Não é possível criar um motivo de atraso para "todos" os projetos. Selecione um projeto específico.',
      );
    }

    return this.repository.createDelayReason({
      ...data,
      category: data.category as any,
    });
  }

  async deleteDelayReason(id: string) {
    return this.repository.deleteDelayReason(id);
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  async listCategories() {
    return this.repository.listCategories();
  }

  async createCategory(data: {
    name: string;
    description?: string;
    order?: number;
  }) {
    return this.repository.createCategory(data);
  }

  // ==========================================
  // ACTIVITIES
  // ==========================================

  async listActivities(categoryId?: string) {
    return this.repository.listActivities(categoryId);
  }

  async createActivity(data: {
    name: string;
    description?: string;
    categoryId: string;
    weight?: number;
    order?: number;
  }) {
    return this.repository.createActivity(data);
  }

  // ==========================================
  // UNIT COSTS
  // ==========================================

  async listUnitCosts(projectId: string) {
    return this.repository.listUnitCosts(projectId);
  }

  async upsertUnitCosts(projectId: string, costs: any[]) {
    return this.repository.upsertUnitCosts(projectId, costs);
  }
}
