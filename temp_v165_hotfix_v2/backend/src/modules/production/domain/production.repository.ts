export type ActivityStatus = "PENDING" | "IN_PROGRESS" | "FINISHED";

export interface ProductionProgress {
  id?: string;
  projectId: string;
  elementId: string;
  activityId: string;
  currentStatus: ActivityStatus;
  progressPercent: number;
  history: any[]; // Historical logs
  dailyProduction: Record<string, any>; // Keyed by date
  requiresApproval?: boolean;
  approvalReason?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  activity?: any;
  updatedAt?: Date;
  createdAt?: Date;
}

export interface ProductionRepository {
  save(progress: ProductionProgress): Promise<ProductionProgress>;
  findById(id: string): Promise<ProductionProgress | null>;
  findByElement(elementId: string): Promise<ProductionProgress[]>;
  findByActivity(
    projectId: string,
    activityId: string,
  ): Promise<ProductionProgress[]>;
  findElementsWithProgress(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
  ): Promise<any[]>;
  findLinkedActivityIds(projectId: string, siteId?: string): Promise<string[]>;
  findSchedule?(elementId: string, activityId: string): Promise<any | null>;
  syncWorkStages?(
    elementId: string,
    activityId: string,
    projectId: string,
    updatedBy: string,
  ): Promise<void>;
  findPendingLogs(companyId?: string | null): Promise<ProductionProgress[]>;
  findElementProjectId(elementId: string): Promise<string | null>;
  findElementCompanyId(elementId: string): Promise<string | null>;
  findProgress(
    elementId: string,
    activityId?: string,
  ): Promise<ProductionProgress | null>;

  // Schedule Support
  findScheduleByElement(
    elementId: string,
    activityId: string,
  ): Promise<any | null>;
  findScheduleById(id: string): Promise<any | null>;
  saveSchedule(data: any): Promise<any>;
  deleteSchedule(id: string): Promise<void>;
  deleteSchedulesBatch(ids: string[]): Promise<number>;
  findSchedulesByScope(params: {
    projectId?: string;
    companyId?: string;
    elementId?: string;
    activityId?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]>;
  splitSchedule(id: string, updateData: any, createData: any): Promise<void>;
  findAllIAPs(): Promise<any[]>;
}
