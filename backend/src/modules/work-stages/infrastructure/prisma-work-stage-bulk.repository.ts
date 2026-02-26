import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { ICacheService } from "@/services/cache.interface";
import {
  WorkStageBulkRepository,
  WorkStage,
  CreateWorkStageBulkItem,
} from "../domain/work-stage.repository";
import { WorkStageProgress } from "../domain/work-stage-progress.repository";

export class PrismaWorkStageBulkRepository implements WorkStageBulkRepository {
  constructor(private readonly cacheService: ICacheService) {}

  async createBulk(
    projectId: string,
    siteId: string | undefined,
    data: CreateWorkStageBulkItem[],
  ): Promise<WorkStage[]> {
    const results: WorkStage[] = [];

    await prisma.$transaction(async (tx) => {
      // 1. Buscar etapas existentes para evitar duplicatas por nome
      const existingStages = await tx.workStage.findMany({
        where: {
          projectId,
          siteId: siteId || null,
        },
        select: { id: true, name: true, parentId: true },
      });

      const existingMap = new Map(
        existingStages.map((s) => [
          `${s.name.trim().toUpperCase()}-${s.parentId || "root"}`,
          s.id,
        ]),
      );

      // Processamento Achatado (Pai/Filho em fases)
      for (const parentItem of data) {
        const parentId = await this.upsertStage(tx as unknown, projectId, siteId, parentItem, null, existingMap);
        
        if (parentItem.children && parentItem.children.length > 0) {
          const children = parentItem.children;
          for (const childItem of children) {
            await this.upsertStage(tx as unknown, projectId, siteId, childItem, parentId, existingMap);
          }
        }
      }
    });

    // Invalida o cache apenas UMA vez ao final de TODAS as inserções
    await this.cacheService.delByPattern("work_stages:list:*");
    
    return results;
  }

  private async upsertStage(
    tx: unknown, 
    projectId: string, 
    siteId: string | undefined, 
    item: CreateWorkStageBulkItem, 
    parentId: string | null, 
    existingMap: Map<string, string>
  ): Promise<string> {
    const key = `${item.name.trim().toUpperCase()}-${parentId || "root"}`;
    const existingId = existingMap.get(key);

    const data: Prisma.WorkStageUncheckedCreateInput = {
      name: item.name,
      description: item.description,
      weight: item.weight ?? 1.0,
      displayOrder: item.displayOrder,
      productionActivityId: item.productionActivityId || null,
      siteId: siteId || null,
      projectId: projectId,
      parentId: parentId,
      metadata: (item.metadata || {}) as Prisma.InputJsonValue,
    };

    if (existingId) {
      const updated = await tx.workStage.update({ where: { id: existingId }, data });
      return updated.id;
    } else {
      const created = await tx.workStage.create({ data });
      return created.id;
    }
  }

  private mapToWorkStage(data: unknown): WorkStage {
    const d = data as Record<string, any>;
    return {
      id: d.id as string,
      name: d.name as string,
      description: d.description as string | null,
      weight: Number(d.weight || 1.0),
      siteId: d.siteId as string | null,
      projectId: d.projectId as string | null,
      productionActivityId: d.productionActivityId as string | null,
      parentId: d.parentId as string | null,
      displayOrder: (d.displayOrder as number) || 0,
      metadata: (d.metadata as Record<string, unknown>) || {},
      progress: (d.stageProgress || d.progress || []) as WorkStageProgress[],
    };
  }
}
