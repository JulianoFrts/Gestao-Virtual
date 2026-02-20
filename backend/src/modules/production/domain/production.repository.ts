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

export interface ProductionProgressRepository {
  save(progress: ProductionProgress): Promise<ProductionProgress>;
  saveMany(progresses: ProductionProgress[]): Promise<void>;
  findById(id: string): Promise<ProductionProgress | null>;
  findByElement(elementId: string): Promise<ProductionProgress[]>;
  findByElementsBatch(elementIds: string[]): Promise<ProductionProgress[]>;
  findByActivity(
    projectId: string,
    activityId: string,
  ): Promise<ProductionProgress[]>;
  findPendingLogs(companyId?: string | null): Promise<ProductionProgress[]>;
  findProgress(
    elementId: string,
    activityId?: string,
  ): Promise<ProductionProgress | null>;
}
