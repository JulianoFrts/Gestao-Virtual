import { GovernanceRepository } from "../domain/governance.repository";

export class GovernanceService {
  constructor(private readonly repository: GovernanceRepository) {}

  async getHistory(type: string, limit: number) {
    const results: any = {};

    if (type === "all" || type === "architectural") {
      results.architectural =
        await this.repository.findGovernanceHistory(limit);
    }

    if (type === "all" || type === "routes") {
      results.routes = await this.repository.findRouteHealthHistory(limit);
    }

    return results;
  }

  // Methods for Auditor
  async findOpenViolation(file: string, violation: string) {
    return this.repository.findOpenViolation(file, violation);
  }

  async createViolation(data: any) {
    return this.repository.createViolation(data);
  }

  async updateViolation(id: string, data: any) {
    return this.repository.updateViolation(id, data);
  }

  async findOpenViolations() {
    return this.repository.findOpenViolations();
  }

  async listViolationsWithFilters(filters: any) {
    return this.repository.findViolationsWithFilters(filters);
  }
}
