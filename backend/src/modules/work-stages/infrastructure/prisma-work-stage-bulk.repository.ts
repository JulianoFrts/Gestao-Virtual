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

      for (const item of data) {
        const itemKey = `${item.name.trim().toUpperCase()}-root`;
        let parentId = existingMap.get(itemKey);

        if (!parentId) {
          // Criar o pai (Meta Mãe) se não existir
          const parent = await tx.workStage.create({
            data: {
              name: item.name,
              description: item.description,
              weight: item.weight ?? 1.0,
              displayOrder: item.displayOrder,
              productionActivityId: item.productionActivityId || null,
              siteId: siteId || null,
              projectId: projectId,
              parentId: null,
              metadata: (item.metadata || {}) as Prisma.InputJsonValue,
            },
          });
          parentId = parent.id;
          results.push(this.mapToWorkStage(parent));
        } else {
          // Atualizar o pai existente
          const updatedParent = await tx.workStage.update({
            where: { id: parentId },
            data: {
              weight: item.weight ?? 1.0,
              displayOrder: item.displayOrder,
              productionActivityId: item.productionActivityId || null,
              metadata: (item.metadata || {}) as Prisma.InputJsonValue,
            },
          });
          results.push(this.mapToWorkStage(updatedParent));
        }

        // Se tiver filhos, criar cada um vinculado ao pai
        if (item.children && item.children.length > 0) {
          for (const child of item.children) {
            const childKey = `${child.name.trim().toUpperCase()}-${parentId}`;
            const existingChildId = existingMap.get(childKey);

            if (!existingChildId) {
              const createdChild = await tx.workStage.create({
                data: {
                  name: child.name,
                  description: child.description,
                  weight: child.weight ?? 1.0,
                  displayOrder: child.displayOrder,
                  productionActivityId: child.productionActivityId || null,
                  siteId: siteId || null,
                  projectId: projectId,
                  parentId: parentId,
                  metadata: (child.metadata || {}) as Prisma.InputJsonValue,
                },
              });
              results.push(this.mapToWorkStage(createdChild));
            } else {
              // Atualizar filho existente
              const updatedChild = await tx.workStage.update({
                where: { id: existingChildId },
                data: {
                  weight: child.weight ?? 1.0,
                  displayOrder: child.displayOrder,
                  productionActivityId: child.productionActivityId || null,
                  metadata: (child.metadata || {}) as Prisma.InputJsonValue,
                },
              });
              results.push(this.mapToWorkStage(updatedChild));
            }
          }
        }
      }
    });

    // Invalida o cache apenas UMA vez ao final de TODAS as inserções
    await this.cacheService.delByPattern("work_stages:list:*");

    return results;
  }

  private mapToWorkStage(data: any): WorkStage {
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
