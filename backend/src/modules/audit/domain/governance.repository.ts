export interface GovernanceAuditHistory {
  id: string;
  file: string;
  violation: string;
  message: string;
  severity: string;
  suggestion?: string | null;
  status: string;
  lastDetectedAt: Date;
  resolvedAt?: Date | null;
  performerId?: string | null;
  performer?: {
    name: string;
    image?: string | null;
    role: string;
  };
}

export interface RouteHealthHistory {
  id: string;
  route: string;
  status: string;
  responseTime?: number | null;
  errorMessage?: string | null;
  checkedAt: Date;
  performerId?: string | null;
  performer?: {
    name: string;
    image?: string | null;
    role: string;
  };
}

export interface GovernanceRepository {
  findGovernanceHistory(
    limit: number,
    companyId?: string,
  ): Promise<GovernanceAuditHistory[]>;
  findRouteHealthHistory(
    limit: number,
    companyId?: string,
  ): Promise<RouteHealthHistory[]>;

  // For Auditor
  findOpenViolation(file: string, violation: string): Promise<GovernanceAuditHistory | null>;
  createViolation(data: Partial<GovernanceAuditHistory>): Promise<GovernanceAuditHistory>;
  updateViolation(id: string, data: Partial<GovernanceAuditHistory>): Promise<GovernanceAuditHistory>;
  findOpenViolations(): Promise<GovernanceAuditHistory[]>;
  findViolationsWithFilters(
    filters: Record<string, unknown>,
    take?: number,
    skip?: number,
  ): Promise<GovernanceAuditHistory[]>;
  countViolations(filters: Record<string, unknown>): Promise<number>;
}
