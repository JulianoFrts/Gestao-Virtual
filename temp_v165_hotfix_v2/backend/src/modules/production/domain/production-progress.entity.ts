import {
  ActivityStatus,
  ProductionProgress as IProductionProgress,
} from "./production.repository";

export class ProductionProgress implements IProductionProgress {
  id?: string;
  projectId: string;
  elementId: string;
  activityId: string;
  currentStatus: ActivityStatus;
  progressPercent: number;
  startDate?: Date | null;
  endDate?: Date | null;
  history: any[];
  dailyProduction: Record<string, any>;
  requiresApproval?: boolean;
  approvalReason?: string | null;
  activity?: any;
  updatedAt?: Date;
  createdAt?: Date;

  constructor(data: IProductionProgress) {
    this.id = data.id;
    this.projectId = data.projectId;
    this.elementId = data.elementId;
    this.activityId = data.activityId;
    this.currentStatus = data.currentStatus;
    this.progressPercent = data.progressPercent;
    this.history = data.history || [];
    this.dailyProduction = data.dailyProduction || {};
    this.requiresApproval = data.requiresApproval;
    this.approvalReason = data.approvalReason;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.activity = data.activity;

    // Fallback logic for older records missing top-level dates
    if (!this.startDate || !this.endDate) {
      const history = Array.isArray(this.history) ? this.history : [];
      const finishedLog = history.find((h: any) => h.status === 'FINISHED' || (h.progressPercent || 0) >= 100);
      
      if (!this.startDate) {
        const firstLog = history[0];
        this.startDate = firstLog?.finalStartDate || firstLog?.startDate || firstLog?.timestamp || data.createdAt || null;
      }
      if (!this.endDate && (this.currentStatus === 'FINISHED' || Number(this.progressPercent) >= 100)) {
        this.endDate = finishedLog?.finalEndDate || finishedLog?.endDate || finishedLog?.timestamp || data.updatedAt || null;
      }
    }

    this.updatedAt = data.updatedAt;
    this.createdAt = data.createdAt;
  }

  /**
   * Registra uma mudança de progresso (Tell, Don't Ask)
   */
  public recordProgress(
    status: ActivityStatus,
    progress: number,
    metadata: any,
    userId?: string,
  ): void {
    this.currentStatus = status;
    this.progressPercent = progress;

    const logEntry = {
      status,
      progressPercent: progress,
      metadata,
      changedBy: userId,
      timestamp: new Date().toISOString(),
    };

    this.history.push(logEntry);
    this.updatedAt = new Date();
  }

  /**
   * Aprova um log específico no histórico
   */
  public approveLog(logTimestamp: string, approvedBy: string): void {
    const entryIndex = this.history.findIndex(
      (entry: any) => entry.timestamp === logTimestamp,
    );

    if (entryIndex === -1) {
      throw new Error("Log entry not found in history");
    }

    this.history[entryIndex] = {
      ...this.history[entryIndex],
      status: "APPROVED",
      approvedBy,
      approvedAt: new Date().toISOString(),
    };

    this.updatedAt = new Date();
  }

  /**
   * Registra produção diária (HHH e quantidade)
   */
  public recordDailyProduction(date: string, data: any, userId: string): void {
    this.dailyProduction[date] = {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    this.updatedAt = new Date();
  }
}
