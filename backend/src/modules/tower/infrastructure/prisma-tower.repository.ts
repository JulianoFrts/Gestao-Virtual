import { prisma } from "@/lib/prisma/client";
import { Tower, TowerRepository } from "../domain/tower.repository";

export class PrismaTowerRepository implements TowerRepository {
  private mapToUnified(tower: Tower) {
    const {
      projectId,
      companyId,
      objectId,
      objectSeq,
      towerType,
      height,
      elevation,
      latitude,
      longitude,
      deflection,
      goForward,
      fuso,
      fixConductor,
      trecho,
      technicalKm,
      technicalIndex,
      circuitId,
      concreteVolume,
      steelWeight,
      structureWeight,
      foundationType,
      metadata,
    } = tower;

    return {
      companyId: companyId!,
      projectId: projectId!,
      elementType: "TOWER",
      externalId: objectId,
      sequence: objectSeq || 0,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      elevation: elevation ? Number(elevation) : null,
      name: `${towerType || "Tower"} ${objectId}`,
      metadata: {
        towerType,
        height,
        deflection,
        goForward,
        fuso,
        fixConductor,
        trecho,
        technicalKm,
        technicalIndex,
        circuitId,
        concreteVolume,
        steelWeight,
        structureWeight,
        foundationType,
        ...(metadata || {}),
      },
    };
  }

  private mapFromUnified(unified: any): Tower {
    const meta = unified.metadata as any;
    return {
      id: unified.id,
      projectId: unified.projectId,
      companyId: unified.companyId,
      objectId: unified.externalId,
      objectSeq: unified.sequence,
      towerType: meta?.towerType,
      height: meta?.height,
      elevation: unified.elevation ? Number(unified.elevation) : undefined,
      latitude: unified.latitude ? Number(unified.latitude) : undefined,
      longitude: unified.longitude ? Number(unified.longitude) : undefined,
      deflection: meta?.deflection,
      goForward: meta?.goForward,
      fuso: meta?.fuso,
      fixConductor: meta?.fixConductor,
      trecho: meta?.trecho,
      technicalKm: meta?.technicalKm,
      technicalIndex: meta?.technicalIndex,
      circuitId: meta?.circuitId,
      concreteVolume: meta?.concreteVolume,
      steelWeight: meta?.steelWeight,
      structureWeight: meta?.structureWeight,
      foundationType: meta?.foundationType,
      metadata: meta,
      createdAt: unified.createdAt,
      updatedAt: unified.updatedAt,
    };
  }

  async save(tower: Tower): Promise<Tower> {
    const data = this.mapToUnified(tower);

    if (tower.id) {
      return this.performUpdate(tower.id, data);
    }

    return this.performUpsert(data);
  }

  private async performUpdate(id: string, data: any): Promise<Tower> {
    const updated = await prisma.mapElementTechnicalData.update({
      where: { id },
      data: data,
    });
    return this.mapFromUnified(updated);
  }

  private async performUpsert(data: any): Promise<Tower> {
    const upserted = await prisma.mapElementTechnicalData.upsert({
      where: {
        projectId_externalId: {
          projectId: data.projectId,
          externalId: data.externalId,
        },
      },
      update: data,
      create: data,
    });
    return this.mapFromUnified(upserted);
  }

  async saveMany(towers: Tower[]): Promise<Tower[]> {
    const results: Tower[] = [];
    const BATCH_SIZE = 50;

    for (let i = 0; i < towers.length; i += BATCH_SIZE) {
      const batch = towers.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((tower) => this.save(tower)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  async findById(id: string): Promise<Tower | null> {
    const found = await prisma.mapElementTechnicalData.findUnique({
      where: { id },
    });
    return found ? this.mapFromUnified(found) : null;
  }

  async findByObjectId(
    projectId: string,
    objectId: string,
  ): Promise<Tower | null> {
    const found = await prisma.mapElementTechnicalData.findUnique({
      where: { projectId_externalId: { projectId, externalId: objectId } },
    });
    return found ? this.mapFromUnified(found) : null;
  }

  async findByProject(projectId: string): Promise<Tower[]> {
    const found = await prisma.mapElementTechnicalData.findMany({
      where: { projectId, elementType: "TOWER" },
      orderBy: { sequence: "asc" },
    });
    return found.map((f) => this.mapFromUnified(f));
  }

  async deleteByProject(projectId: string): Promise<number> {
    const result = await prisma.mapElementTechnicalData.deleteMany({
      where: { projectId, elementType: "TOWER" },
    });
    return result.count;
  }

  async delete(id: string): Promise<boolean> {
    await prisma.mapElementTechnicalData.delete({
      where: { id },
    });
    return true;
  }
}
