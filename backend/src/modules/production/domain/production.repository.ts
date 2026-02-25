export type ActivityStatus = "PENDING" | "IN_PROGRESS" | "FINISHED";

/** Entrada individual do histórico de progresso */
export interface ProgressHistoryEntry {
  status: string;
  progressPercent?: number;
  metadata?: Record<string, unknown>;
  changedBy?: string;
  timestamp?: string;
  approvedBy?: string;
  approvedAt?: string;
  finalStartDate?: string | Date;
  startDate?: string | Date;
  finalEndDate?: string | Date;
  endDate?: string | Date;
  [key: string]: unknown;
}

/** Registro diário de produção */
export interface DailyProductionRecord {
  updatedAt?: string;
  updatedBy?: string;
  [key: string]: unknown;
}

/** Referência básica de atividade */
export interface ActivityReference {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface ProductionProgress {
  id?: string;
  projectId: string;
  elementId: string;
  activityId: string;
  currentStatus: ActivityStatus;
  progressPercent: number;
  history: ProgressHistoryEntry[]; // Historical logs
  dailyProduction: Record<string, DailyProductionRecord>; // Keyed by date
  requiresApproval?: boolean;
  approvalReason?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  activity?: ActivityReference;
  element?: Record<string, unknown>;
  project?: Record<string, unknown>;
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
