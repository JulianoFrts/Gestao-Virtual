import { prisma } from "@/lib/prisma/client";
import {
  TowerActivityGoalData,
  TowerActivityRepository,
} from "../domain/tower-activity.repository";

export class PrismaTowerActivityRepository implements TowerActivityRepository {
  async save(data: TowerActivityGoalData): Promise<TowerActivityGoalData> {
    const { id, children, ...rest } = data;
    if (id) {
      return (await prisma.towerActivityGoal.update({
        where: { id },
        data: rest as any,
      })) as unknown as TowerActivityGoalData;
    }
    return (await prisma.towerActivityGoal.create({
      data: rest as any,
    })) as unknown as TowerActivityGoalData;
  }

  async saveMany(
    elements: TowerActivityGoalData[],
  ): Promise<TowerActivityGoalData[]> {
    if (elements.length === 0) return [];
    // For hierarchy, sequential or careful batch insert is needed if they have parents in the same batch
    // Here we use sequential for safety with hierarchical links
    const results: TowerActivityGoalData[] = [];
    for (const el of elements) {
      results.push(await this.save(el));
    }
    return results;
  }

  async findById(id: string): Promise<TowerActivityGoalData | null> {
    return (await prisma.towerActivityGoal.findUnique({
      where: { id },
      include: { children: true },
    })) as unknown as TowerActivityGoalData | null;
  }

  async findByProject(projectId: string): Promise<TowerActivityGoalData[]> {
    return (await prisma.towerActivityGoal.findMany({
      where: { projectId },
      orderBy: [{ level: "asc" }, { order: "asc" }],
    })) as unknown as TowerActivityGoalData[];
  }

  async findHierarchy(projectId: string): Promise<TowerActivityGoalData[]> {
    const all = await prisma.towerActivityGoal.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    // Simple nesting logic (could be optimized with raw SQL or recursive include)
    const buildTree = (
      parentId: string | null = null,
    ): TowerActivityGoalData[] => {
      return all
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...(item as unknown as TowerActivityGoalData),
          children: buildTree(item.id),
        }));
    };

    return buildTree();
  }

  async delete(id: string): Promise<boolean> {
    // Delete children first or rely on cascade if configured (Prisma doesn't easily do recursive delete)
    // We'll trust the parent relationship or simple delete if atomic
    await prisma.towerActivityGoal.delete({ where: { id } });
    return true;
  }

  async move(
    id: string,
    newParentId: string | null,
    newOrder: number,
  ): Promise<TowerActivityGoalData> {
    return (await prisma.towerActivityGoal.update({
      where: { id },
      data: { parentId: newParentId, order: newOrder },
    })) as unknown as TowerActivityGoalData;
  }
}
