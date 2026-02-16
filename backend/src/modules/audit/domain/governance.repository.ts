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
  findGovernanceHistory(limit: number): Promise<GovernanceAuditHistory[]>;
  findRouteHealthHistory(limit: number): Promise<RouteHealthHistory[]>;

  // For Auditor
  findOpenViolation(file: string, violation: string): Promise<any>;
  createViolation(data: any): Promise<any>;
  updateViolation(id: string, data: any): Promise<any>;
  findOpenViolations(): Promise<any[]>;
  findViolationsWithFilters(filters: any, take?: number, skip?: number): Promise<GovernanceAuditHistory[]>;
  countViolations(filters: any): Promise<number>;
}
