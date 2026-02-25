import {
  TowerActivityGoalData,
  TowerActivityRepository,
} from "../domain/tower-activity.repository";
import { WorkStageRepository } from "@/modules/work-stages/domain/work-stage.repository";
import { logger } from "@/lib/utils/logger";

export class TowerActivityService {
  constructor(
    private readonly repository: TowerActivityRepository,
    private readonly workStageRepository?: WorkStageRepository,
  ) {}

  async importGoals(
    projectId: string,
    companyId: string,
    data: any[],
  ): Promise<any> {
    if (!projectId || projectId === "all") {
      throw new Error("Project ID is required and cannot be 'all'");
    }

    if (!companyId || companyId === "all") {
      throw new Error("Company ID is required and cannot be 'all'");
    }

    logger.info(
      `[TowerActivityService] Importing ${data.length} goals for project ${projectId}`,
    );

    // 0. Fetch existing goals to prevent duplicates
    const existingGoals = await this.repository.findByProject(projectId);
    const existingMap = new Map(
      existingGoals.map((g) => [
        `${g.name.trim().toUpperCase()}-${g.parentId || "root"}`,
        g.id,
      ]),
    );

    // Phase 1: Save parent activities (level 1) first
    const parents = data.filter((item) => item.level === 1);
    const children = data.filter((item) => item.level > 1);

    const parentElementsToCreate: TowerActivityGoalData[] = [];
    const parentNameToId = new Map<string, string>();

    for (const item of parents) {
      const key = `${item.name.trim().toUpperCase()}-root`;
      const existingId = existingMap.get(key);

      if (existingId) {
        parentNameToId.set(item.name, existingId);
        parentNameToId.set(item.name.trim().toUpperCase(), existingId);
        // Optional: Update existing parent metadata?
      } else {
        parentElementsToCreate.push({
          projectId,
          companyId,
          towerId: item.towerId || null,
          name: item.name,
          description: item.description || "",
          level: 1,
          order: Number(item.order || 0),
          metadata: item.metadata || {},
          parentId: null,
        });
      }
    }

    if (parentElementsToCreate.length > 0) {
      const savedParents = await this.repository.saveMany(
        parentElementsToCreate,
      );
      savedParents.forEach((p: any) => {
        parentNameToId.set(p.name, p.id);
        parentNameToId.set(p.name.trim().toUpperCase(), p.id);
      });
    }

    // Phase 3: Save children with resolved parentIds
    let importedChildren = 0;
    if (children.length > 0) {
      const childElementsToCreate: TowerActivityGoalData[] = [];

      for (const item of children) {
        // Resolve parent
        let parentNamePlaceholder = "";
        if (
          typeof item.parentId === "string" &&
          item.parentId.startsWith("__parent_")
        ) {
          parentNamePlaceholder = item.parentId.replace(/__parent_|__/g, "");
        }
        const parentName =
          item.metadata?.parentName || parentNamePlaceholder || null;

        let resolvedParentId = null;
        if (parentName) {
          resolvedParentId =
            parentNameToId.get(parentName) ||
            parentNameToId.get(parentName.trim().toUpperCase()) ||
            null;
        }

        if (resolvedParentId) {
          const childKey = `${item.name.trim().toUpperCase()}-${resolvedParentId}`;
          if (!existingMap.has(childKey)) {
            childElementsToCreate.push({
              projectId,
              companyId,
              towerId: item.towerId || null,
              name: item.name,
              description: item.description || "",
              level: Number(item.level || 2),
              order: Number(item.order || 0),
              metadata: item.metadata || {},
              parentId: resolvedParentId,
            });
          }
        }
      }

      if (childElementsToCreate.length > 0) {
        await this.repository.saveMany(childElementsToCreate);
        importedChildren = childElementsToCreate.length;
      }
    }

    return {
      total: data.length,
      parentsImported: parentElementsToCreate.length,
      childrenImported: importedChildren,
    };
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
    // 1. Buscar dados da meta antes de deletar
    const goal = await this.repository.findById(id);

    if (goal && this.workStageRepository) {
      logger.info(
        `[TowerActivityService] Sincronizando deleção da meta "${goal.name}" com WorkStages`,
      );

      // Buscar WorkStages com mesmo nome no projeto
      const stages = await this.workStageRepository.findAll({
        projectId: goal.projectId,
      });

      const matchedStages = stages.filter(
        (s) => s.name.trim().toUpperCase() === goal.name.trim().toUpperCase(),
      );

      for (const stage of matchedStages) {
        await this.workStageRepository.delete(stage.id);
        logger.info(
          `[TowerActivityService] WorkStage "${stage.id}" removido por sincronização`,
        );
      }
    }

    return this.repository.delete(id);
  }
}
