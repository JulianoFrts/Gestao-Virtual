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

/** Dados de identificação do progresso */
export interface ProductionProgressIdentity {
  id?: string;
  projectId?: string | null;
  elementId: string;
  activityId: string;
}

/** Dados de estado atual do progresso */
export interface ProductionProgressState {
  currentStatus: ActivityStatus;
  progressPercent: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

/** Dados de governança e aprovação */
export interface ProductionProgressGovernance {
  requiresApproval?: boolean;
  approvalReason?: string | null;
  updatedAt?: Date;
  createdAt?: Date;
}

/** Relacionamentos do progresso */
export interface ProductionProgressRelations {
  activity?: ActivityReference;
  element?: Record<string, unknown>;
  project?: Record<string, unknown>;
}

/** Interface Principal (Composição) */
export interface ProductionProgress extends 
  ProductionProgressIdentity, 
  ProductionProgressState, 
  ProductionProgressGovernance,
  ProductionProgressRelations 
{
  history: ProgressHistoryEntry[];
  dailyProduction: Record<string, DailyProductionRecord>;
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
