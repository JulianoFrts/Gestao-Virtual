export type DailyReportStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED";

export interface DailyReportFiltersDTO {
  page?: number;
  limit?: number;
  teamId?: string;
  userId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: DailyReportStatus;
  companyId?: string;
  isAdmin?: boolean;
}

export interface CreateDailyReportDTO {
  teamId?: string;
  userId?: string;
  reportDate: Date | string;
  status?: DailyReportStatus;
  companyId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown; // Allow for 'user', 'team', 'company' connect objects
}

export interface UpdateDailyReportDTO {
  status?: DailyReportStatus;
  approvedById?: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

export interface DailyReportEntity {
  id: string;
  teamId: string;
  userId: string;
  reportDate: Date;
  status: DailyReportStatus;
  approvedById?: string | null;
  rejectionReason?: string | null;
  companyId: string;
  projectId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  // Relational data often included
  user?: { name: string };
  team?: {
    name: string;
    supervisor?: { name: string };
    site?: { projectId: string };
  };
}
