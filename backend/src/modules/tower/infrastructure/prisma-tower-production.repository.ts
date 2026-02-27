import { prisma } from "@/lib/prisma/client";
import {
  TowerProductionData,
  TowerProductionRepository,
} from "../domain/tower-production.repository";

export class PrismaTowerProductionRepository implements TowerProductionRepository {
  async save(data: TowerProductionData): Promise<TowerProductionData> {
    const { id, createdAt, updatedAt, ...rest } = data as any;
    
    // Clean up any relation objects that might have been merged into the data
    const cleanData: any = {};
    const allowedFields = ['towerId', 'sequencia', 'companyId', 'projectId', 'siteId', 'metadata'];
    
    for (const key of allowedFields) {
      if (rest[key] !== undefined) {
        cleanData[key] = rest[key];
      }
    }

    if (id) {
      return (await prisma.towerProduction.update({
        where: { id },
        data: cleanData,
      })) as TowerProductionData;
    }
    return (await prisma.towerProduction.upsert({
      where: {
        projectId_towerId: { projectId: data.projectId, towerId: data.towerId },
      },
      update: cleanData,
      create: cleanData,
    })) as TowerProductionData;
  }

  async saveMany(
    elements: TowerProductionData[],
  ): Promise<TowerProductionData[]> {
    if (elements.length === 0) return [];

    // Clean and validate fields for each element
    const allowedFields = ['towerId', 'sequencia', 'companyId', 'projectId', 'siteId', 'metadata'];

    return await prisma.$transaction(async (tx) => {
      const results: TowerProductionData[] = [];
      
      for (const data of elements) {
        const { id, createdAt, updatedAt, ...rest } = data as any;
        const cleanData: any = {};
        
        for (const key of allowedFields) {
          if (rest[key] !== undefined) {
            cleanData[key] = rest[key];
          }
        }

        if (id) {
          const updated = await tx.towerProduction.update({
            where: { id },
            data: cleanData,
          });
          results.push(updated as unknown as TowerProductionData);
        } else {
          const upserted = await tx.towerProduction.upsert({
            where: {
              projectId_towerId: { projectId: data.projectId, towerId: data.towerId },
            },
            update: cleanData,
            create: cleanData,
          });
          results.push(upserted as unknown as TowerProductionData);
        }
      }
      
      return results;
    });
  }

  async findById(id: string): Promise<TowerProductionData | null> {
    return (await prisma.towerProduction.findUnique({
      where: { id },
    })) as TowerProductionData | null;
  }

  async findByTowerId(
    projectId: string,
    towerId: string,
  ): Promise<TowerProductionData | null> {
    return (await prisma.towerProduction.findUnique({
      where: { projectId_towerId: { projectId, towerId } },
    })) as TowerProductionData | null;
  }

  async findByProject(projectId: string): Promise<TowerProductionData[]> {
    return (await prisma.towerProduction.findMany({
      where: { projectId },
      orderBy: { towerId: "asc" },
    })) as TowerProductionData[];
  }

  async delete(id: string): Promise<boolean> {
    await prisma.towerProduction.delete({ where: { id } });
    return true;
  }

  /**
   * Sincroniza dados técnicos de projeto para torres já existentes na Produção.
   * Faz merge seguro de metadata — NÃO sobrescreve campos de produção existentes.
   */
  async syncTechnicalData(
    projectId: string,
    updates: Array<{
      towerId: string;
      technicalMetadata: Record<string, unknown>;
    }>,
  ): Promise<number> {
    if (updates.length === 0) return 0;

    let syncedCount = 0;

    // Usar transação para garantir atomicidade
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const existing = await tx.towerProduction.findUnique({
          where: { projectId_towerId: { projectId, towerId: update.towerId } },
        });

        if (!existing) continue;

        // Merge seguro: campos técnicos não sobrescrevem dados de produção
        const existingMeta =
          (existing.metadata as Record<string, unknown>) || {};
        const mergedMeta = {
          ...existingMeta,
          // Campos técnicos (só atualiza se valor existe)
          goForward:
            update.technicalMetadata.distancia_vao ?? existingMeta.goForward,
          pesoEstrutura:
            update.technicalMetadata.peso_estrutura ??
            existingMeta.pesoEstrutura,
          totalConcreto:
            update.technicalMetadata.peso_concreto ??
            existingMeta.totalConcreto,
          pesoArmacao:
            update.technicalMetadata.peso_aco_1 ?? existingMeta.pesoArmacao,
          // Coordenadas e Elevação técnico
          latitude: update.technicalMetadata.latitude ?? existingMeta.latitude,
          longitude:
            update.technicalMetadata.longitude ?? existingMeta.longitude,
          elevacao: update.technicalMetadata.elevacao ?? existingMeta.elevacao,
          // Manter campos de produção inalterados
          trecho: existingMeta.trecho,
          towerType: existingMeta.towerType,
        };

        await tx.towerProduction.update({
          where: { id: existing.id },
          data: {
            metadata: mergedMeta,
            sequencia: update.technicalMetadata.sequencia ?? existing.sequencia,
          },
        });

        syncedCount++;
      }
    });

    return syncedCount;
  }
}
