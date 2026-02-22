import {
  TowerActivityGoalData,
  TowerActivityRepository,
} from "../domain/tower-activity.repository";
import { logger } from "@/lib/utils/logger";

export class TowerActivityService {
  constructor(private readonly repository: TowerActivityRepository) {}

  async importGoals(
    projectId: string,
    companyId: string,
    data: any[],
  ): Promise<any> {
    logger.info(
      `[TowerActivityService] Importing ${data.length} goals for project ${projectId}`,
    );

    // Simple import without hierarchy for now, or based on a flat list with parent hints
    const elements: TowerActivityGoalData[] = data.map((item, index) => ({
      projectId,
      companyId,
      towerId: item.towerId || null,
      name: item.name,
      description: item.description || "",
      level: Number(item.level || 1),
      order: Number(item.order || index),
      metadata: item.metadata || {},
      parentId: item.parentId || null,
    }));

    const saved = await this.repository.saveMany(elements);
    return { imported: saved.length, total: data.length };
  }

  async getHierarchy(projectId: string): Promise<TowerActivityGoalData[]> {
    return this.repository.findHierarchy(projectId);
  }

  async saveGoal(data: TowerActivityGoalData): Promise<TowerActivityGoalData> {
    return this.repository.save(data);
  }

  async moveGoal(
    id: string,
    newParentId: string | null,
    newOrder: number,
  ): Promise<TowerActivityGoalData> {
    return this.repository.move(id, newParentId, newOrder);
  }

  async deleteGoal(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
