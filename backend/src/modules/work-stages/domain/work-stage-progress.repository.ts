export interface WorkStageProgress {
  id: string;
  stageId: string;
  actualPercentage: number;
  recordedDate: Date;
  notes?: string | null;
}

export interface WorkStageProgressRepository {
  save(progress: Partial<WorkStageProgress>): Promise<WorkStageProgress>;
  findByDate(stageId: string, date: Date): Promise<WorkStageProgress | null>;
  listProgress(stageId?: string): Promise<WorkStageProgress[]>;
}
