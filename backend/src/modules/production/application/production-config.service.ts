import {
  ProductionConfigRepository,
  DelayCostConfig,
} from "../domain/production-config.repository";
import { ProductionCatalogueRepository } from "../domain/production-catalogue.repository";

export class ProductionConfigService {
  constructor(
    private readonly configRepo: ProductionConfigRepository,
    private readonly catalogueRepo: ProductionCatalogueRepository
  ) { }

  // ==========================================
  // DELAY COST
  // ==========================================

  async getDelayCostConfig(companyId: string, projectId: string) {
    return this.configRepo.getDelayCostConfig(companyId, projectId);
  }

  async upsertDelayCostConfig(data: DelayCostConfig) {
    return this.configRepo.upsertDelayCostConfig(data);
  }

  // ==========================================
  // DELAY REASONS
  // ==========================================

  async listDelayReasons(projectId: string) {
    return this.configRepo.listDelayReasons(projectId);
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

    return this.configRepo.createDelayReason({
      ...data,
      category: data.category as any,
    });
  }

  async deleteDelayReason(id: string) {
    return this.configRepo.deleteDelayReason(id);
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  async listCategories() {
    return this.catalogueRepo.listCategories();
  }

  async createCategory(data: {
    name: string;
    description?: string;
    order?: number;
  }) {
    return this.catalogueRepo.createCategory(data);
  }

  // ==========================================
  // ACTIVITIES
  // ==========================================

  async listActivities(categoryId?: string) {
    return this.catalogueRepo.listActivities(categoryId);
  }

  async createActivity(data: {
    name: string;
    description?: string;
    categoryId: string;
    weight?: number;
    order?: number;
  }) {
    return this.catalogueRepo.createActivity(data);
  }

  // ==========================================
  // UNIT COSTS
  // ==========================================

  async listUnitCosts(projectId: string) {
    return this.catalogueRepo.listUnitCosts(projectId);
  }

  async upsertUnitCosts(projectId: string, costs: any[]) {
    return this.catalogueRepo.upsertUnitCosts(projectId, costs);
  }
}
