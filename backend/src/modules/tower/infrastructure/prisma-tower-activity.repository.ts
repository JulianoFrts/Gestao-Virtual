import { prisma } from "@/lib/prisma/client";
import {
  TowerActivityGoalData,
  TowerActivityRepository,
} from "../domain/tower-activity.repository";

export class PrismaTowerActivityRepository implements TowerActivityRepository {
  async save(data: TowerActivityGoalData): Promise<TowerActivityGoalData> {
    const { parentId, name, description, order, metadata, towerId, siteId } =
      data;

    let calculatedLevel = 0;

    if (parentId) {
      const parent = await prisma.towerActivityGoal.findUnique({
        where: { id: parentId },
      });

      if (!parent) throw new Error("Parent not found");

      calculatedLevel = parent.level + 1;
    }

    const prismaData = {
      name,
      description: description || "",
      level: calculatedLevel,
      order: Number(order || 0),
      metadata: metadata || {},
      projectId: data.projectId,
      companyId: data.companyId,
      towerId: towerId || null,
      siteId: siteId || null,
      parentId: parentId || null,
    };

    if (data.id) {
      return prisma.towerActivityGoal.update({
        where: { id: data.id },
        data: prismaData,
      }) as unknown;
    }

    return prisma.towerActivityGoal.create({
      data: prismaData,
    }) as unknown;
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
    })) as TowerActivityGoalData | null;
  }

  async findByProject(projectId: string): Promise<TowerActivityGoalData[]> {
    return (await prisma.towerActivityGoal.findMany({
      where: { projectId },
      orderBy: [{ level: "asc" }, { order: "asc" }],
    })) as TowerActivityGoalData[];
  }

  async findHierarchy(projectId: string): Promise<TowerActivityGoalData[]> {
    const all = await prisma.towerActivityGoal.findMany({
      where: { projectId },
      orderBy: [{ level: "asc" }, { order: "asc" }],
    });

    // Simple nesting logic (could be optimized with raw SQL or recursive include)
    const buildTree = (
      parentId: string | null = null,
    ): TowerActivityGoalData[] => {
      return all
        .filter((element: unknown) => (element.parentId ?? null) === parentId)
        .map((element: unknown) => ({
          ...(element as TowerActivityGoalData),
          children: buildTree(element.id),
        }));
    };

    return buildTree();
  }

  async delete(id: string): Promise<boolean> {
    // Manually delete children first because the database cascade might not be active
    await prisma.towerActivityGoal.deleteMany({
      where: { parentId: id },
    });

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
    })) as TowerActivityGoalData;
  }
}
