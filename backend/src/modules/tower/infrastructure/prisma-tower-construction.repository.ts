import { prisma } from "@/lib/prisma/client";
import {
  TowerConstructionData,
  TowerConstructionRepository,
} from "../domain/tower-construction.repository";

export class PrismaTowerConstructionRepository implements TowerConstructionRepository {
  async save(data: TowerConstructionData): Promise<TowerConstructionData> {
    const { id, ...rest } = data;
    if (id) {
      return (await prisma.towerConstruction.update({
        where: { id },
        data: rest as unknown,
      })) as TowerConstructionData;
    }
    return (await prisma.towerConstruction.upsert({
      where: {
        projectId_towerId: { projectId: data.projectId, towerId: data.towerId },
      },
      update: rest as unknown,
      create: rest as unknown,
    })) as TowerConstructionData;
  }

  async saveMany(
    elements: TowerConstructionData[],
  ): Promise<TowerConstructionData[]> {
    if (elements.length === 0) return [];
    const results = await Promise.all(elements.map((el) => this.save(el)));
    return results;
  }

  async findById(id: string): Promise<TowerConstructionData | null> {
    return (await prisma.towerConstruction.findUnique({
      where: { id },
    })) as TowerConstructionData | null;
  }

  async findByTowerId(
    projectId: string,
    towerId: string,
  ): Promise<TowerConstructionData | null> {
    return (await prisma.towerConstruction.findUnique({
      where: { projectId_towerId: { projectId, towerId } },
    })) as TowerConstructionData | null;
  }

  async findByProject(projectId: string): Promise<TowerConstructionData[]> {
    return (await prisma.towerConstruction.findMany({
      where: { projectId },
      orderBy: { sequencia: "asc" },
    })) as TowerConstructionData[];
  }

  async delete(id: string): Promise<boolean> {
    await prisma.towerConstruction.delete({ where: { id } });
    return true;
  }
}
