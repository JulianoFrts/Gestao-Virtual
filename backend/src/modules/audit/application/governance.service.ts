import { GovernanceRepository, GovernanceAuditHistory } from "../domain/governance.repository";

export class GovernanceService {
  constructor(private readonly repository: GovernanceRepository) {}

  async getHistory(type: string, limit: number, companyId?: string) {
    const results: any = {};

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
  async findOpenViolation(file: string, violation: string): Promise<GovernanceAuditHistory | null> {
    return this.repository.findOpenViolation(file, violation);
  }

  async createViolation(data: Partial<GovernanceAuditHistory>): Promise<GovernanceAuditHistory> {
    return this.repository.createViolation(data);
  }

  async updateViolation(id: string, data: Partial<GovernanceAuditHistory>): Promise<GovernanceAuditHistory> {
    return this.repository.updateViolation(id, data);
  }

  async findOpenViolations(): Promise<GovernanceAuditHistory[]> {
    return this.repository.findOpenViolations();
  }

  async listViolationsWithFilters(filters: Record<string, any>, take?: number, skip?: number): Promise<GovernanceAuditHistory[]> {
    return this.repository.findViolationsWithFilters(filters, take, skip);
  }

  async countViolations(filters: Record<string, any>): Promise<number> {
    return this.repository.countViolations(filters);
  }
}
