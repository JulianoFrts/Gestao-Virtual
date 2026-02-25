import {
  WorkStageProgressRepository,
  WorkStageProgress,
} from "../domain/work-stage-progress.repository";

export class WorkStageProgressService {
  constructor(private readonly repository: WorkStageProgressRepository) {}

  async upsert(
    data: Partial<WorkStageProgress>,
    securityContext?: any,
  ): Promise<WorkStageProgress> {
    // Basic validation
    if (!data.stageId && !data.id) {
      throw new Error("Stage ID or Progress ID is required");
    }

    // Security check could be added here if needed,
    // but for now we'll match the existing logic which was simpler.

    return this.repository.save(data);
  }

  async list(stageId?: string): Promise<WorkStageProgress[]> {
    return this.repository.listProgress(stageId);
  }

  async findByDate(
    stageId: string,
    date: Date,
  ): Promise<WorkStageProgress | null> {
    return this.repository.findByDate(stageId, date);
  }
}
