import { WorkStageRepository } from "../domain/work-stage.repository";
import { logger } from "@/lib/utils/logger";

export class WorkStageReorderService {
  constructor(private readonly repository: WorkStageRepository) {}

  async syncOrderWithGoals(projectId: string): Promise<void> {
    try {
      const goals = (await this.repository.findGoalsByProject(projectId)) as any[];
      if (goals.length === 0) return;

      const stages = await this.repository.findAll({ projectId });
      const updates: { id: string; displayOrder: number }[] = [];

      for (const goal of goals) {
        const goalName = goal.name.trim().toUpperCase();
        const matchedStages = stages.filter(
          (s) => s.name.trim().toUpperCase() === goalName,
        );

        for (const stage of matchedStages) {
          if (stage.displayOrder !== goal.order) {
            updates.push({ id: stage.id, displayOrder: goal.order });
          }
        }
      }

      if (updates.length > 0) {
        await this.repository.reorder(updates);
      }
    } catch (error: any) {
      logger.error(
        `[WorkStageReorderService] syncOrderWithGoals error: ${error.message}`,
      );
    }
  }

  async reorder(
    updates: { id: string; displayOrder: number }[],
  ): Promise<void> {
    return this.repository.reorder(updates);
  }
}
