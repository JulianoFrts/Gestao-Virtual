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
    data: Record<string, unknown>[],
  ): Promise<unknown> {
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
    const parents = data.filter((entry) => element.level === 1);
    const children = data.filter((entry) => element.level > 1);

    const parentElementsToCreate: TowerActivityGoalData[] = [];
    const parentNameToId = new Map<string, string>();

    for (const element of parents) {
      const key = `${element.name.trim().toUpperCase()}-root`;
      const existingId = existingMap.get(key);

      if (existingId) {
        parentNameToId.set(element.name, existingId);
        parentNameToId.set(element.name.trim().toUpperCase(), existingId);
        // Optional: Update existing parent metadata?
      } else {
        parentElementsToCreate.push({
          projectId,
          companyId,
          towerId: element.towerId || null,
          name: element.name,
          description: element.description || "",
          level: 1 /* literal */,
          order: Number(element.order || 0),
          metadata: element.metadata || {},
          parentId: null,
        });
      }
    }

    if (parentElementsToCreate.length > 0) {
      const savedParents = await this.repository.saveMany(
        parentElementsToCreate,
      );
      savedParents.forEach((p: unknown) => {
        parentNameToId.set(p.name, p.id);
        parentNameToId.set(p.name.trim().toUpperCase(), p.id);
      });
    }

    // Phase 3: Save children with resolved parentIds
    let importedChildren = 0;
    if (children.length > 0) {
      const childElementsToCreate: TowerActivityGoalData[] = [];

      for (const element of children) {
        // Resolve parent
        let parentNamePlaceholder = "";
        if (
          typeof element.parentId === "string" &&
          element.parentId.startsWith("__parent_")
        ) {
          parentNamePlaceholder = element.parentId.replace(/__parent_|__/g, "");
        }
        const parentName =
          element.metadata?.parentName || parentNamePlaceholder || null;

        let resolvedParentId = null;
        if (parentName) {
          resolvedParentId =
            parentNameToId.get(parentName) ||
            parentNameToId.get(parentName.trim().toUpperCase()) ||
            null;
        }

        if (resolvedParentId) {
          const childKey = `${element.name.trim().toUpperCase()}-${resolvedParentId}`;
          if (!existingMap.has(childKey)) {
            childElementsToCreate.push({
              projectId,
              companyId,
              towerId: element.towerId || null,
              name: element.name,
              description: element.description || "",
              level: Number(element.level || 2),
              order: Number(element.order || 0),
              metadata: element.metadata || {},
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
