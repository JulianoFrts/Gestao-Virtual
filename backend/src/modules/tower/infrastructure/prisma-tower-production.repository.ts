import { prisma } from "@/lib/prisma/client";
import {
  TowerProductionData,
  TowerProductionRepository,
} from "../domain/tower-production.repository";

export class PrismaTowerProductionRepository implements TowerProductionRepository {
  async save(data: TowerProductionData): Promise<TowerProductionData> {
    const { id, ...rest } = data;
    if (id) {
      return (await prisma.towerProduction.update({
        where: { id },
        data: rest as any,
      })) as unknown as TowerProductionData;
    }
    return (await prisma.towerProduction.upsert({
      where: {
        projectId_towerId: { projectId: data.projectId, towerId: data.towerId },
      },
      update: rest as any,
      create: rest as any,
    })) as unknown as TowerProductionData;
  }

  async saveMany(
    elements: TowerProductionData[],
  ): Promise<TowerProductionData[]> {
    if (elements.length === 0) return [];

    // Using individual upserts for safety or batching if needed
    // For now, simple batching with Promise.all for reasonable sizes
    const results = await Promise.all(elements.map((el) => this.save(el)));
    return results;
  }

  async findById(id: string): Promise<TowerProductionData | null> {
    return (await prisma.towerProduction.findUnique({
      where: { id },
    })) as unknown as TowerProductionData | null;
  }

  async findByTowerId(
    projectId: string,
    towerId: string,
  ): Promise<TowerProductionData | null> {
    return (await prisma.towerProduction.findUnique({
      where: { projectId_towerId: { projectId, towerId } },
    })) as unknown as TowerProductionData | null;
  }

  async findByProject(projectId: string): Promise<TowerProductionData[]> {
    return (await prisma.towerProduction.findMany({
      where: { projectId },
      orderBy: { towerId: "asc" },
    })) as unknown as TowerProductionData[];
  }

  async delete(id: string): Promise<boolean> {
    await prisma.towerProduction.delete({ where: { id } });
    return true;
  }
}
