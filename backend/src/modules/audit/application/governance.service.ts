import { GovernanceRepository } from "../domain/governance.repository";

export class GovernanceService {
  constructor(private readonly repository: GovernanceRepository) {}

  async getHistory(type: string, limit: number, companyId?: string) {
    const results: unknown = {};

    if (type === "all" || type === "architectural") {
      results.architectural = await this.repository.findGovernanceHistory(
        limit,
        companyId,
      );
    }

    if (type === "all" || type === "routes") {
      results.routes = await this.repository.findRouteHealthHistory(
        limit,
        companyId,
      );
    }

    return results;
  }

  // Methods for Auditor
  async findOpenViolation(file: string, violation: string) {
    return this.repository.findOpenViolation(file, violation);
  }

  async createViolation(data: unknown) {
    return this.repository.createViolation(data);
  }

  async updateViolation(id: string, data: unknown) {
    return this.repository.updateViolation(id, data);
  }

  async findOpenViolations(): Promise<unknown> {
    return this.repository.findOpenViolations();
  }

  async listViolationsWithFilters(filters: unknown, take?: number, skip?: number) {
    return this.repository.findViolationsWithFilters(filters, take, skip);
  }

  async countViolations(filters: unknown) {
    return this.repository.countViolations(filters);
  }
}
