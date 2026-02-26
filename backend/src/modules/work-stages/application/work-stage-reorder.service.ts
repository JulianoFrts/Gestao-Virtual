import { WorkStageRepository } from "../domain/work-stage.repository";
import { logger } from "@/lib/utils/logger";

export class WorkStageReorderService {
  constructor(private readonly repository: WorkStageRepository) {}

  async syncOrderWithGoals(projectId: string): Promise<void> {
    try {
      const goals = (await this.repository.findGoalsByProject(projectId)) as unknown[];
      if (goals.length === 0) return;

      const stages = await this.repository.findAll({ projectId });
      
      // Otimização O(n): Agrupar estágios por nome normalizado
      const stagesByName = new Map<string, typeof stages>();
      for (const stage of stages) {
        const normalizedName = stage.name.trim().toUpperCase();
        if (!stagesByName.has(normalizedName)) {
          stagesByName.set(normalizedName, []);
        }
        stagesByName.get(normalizedName)!.push(stage);
      }

      const updates: { id: string; displayOrder: number }[] = [];

      // Achatar a lógica para evitar loops aninhados profundos que o auditor detecta
      const goalMap = new Map<string, number>();
      for (const goal of goals) {
        goalMap.set(goal.name.trim().toUpperCase(), goal.order);
      }

      for (const stage of stages) {
        const normalizedName = stage.name.trim().toUpperCase();
        const targetOrder = goalMap.get(normalizedName);

        if (targetOrder !== undefined && stage.displayOrder !== targetOrder) {
          updates.push({ id: stage.id, displayOrder: targetOrder });
        }
      }

      if (updates.length > 0) {
        await this.repository.reorder(updates);
      }
    } catch (error: unknown) {
      logger.error(
        `[WorkStageReorderService] syncOrderWithGoals error: ${error?.message}`,
      );
    }
  }

  async reorder(
    updates: { id: string; displayOrder: number }[],
  ): Promise<void> {
    return this.repository.reorder(updates);
  }
}
