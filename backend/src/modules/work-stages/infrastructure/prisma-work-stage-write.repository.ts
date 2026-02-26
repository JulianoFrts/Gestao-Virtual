import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { ICacheService } from "@/services/cache.interface";
import {
  WorkStageWriteRepository,
  WorkStage,
  CreateWorkStageDTO,
} from "../domain/work-stage.repository";
import {
  WorkStageProgressRepository,
  WorkStageProgress,
} from "../domain/work-stage-progress.repository";
import { PrismaWorkStageProgressRepository } from "./prisma-work-stage-progress.repository";

export class PrismaWorkStageWriteRepository implements WorkStageWriteRepository {
  private readonly progressRepo: WorkStageProgressRepository;

  constructor(
    private readonly cacheService: ICacheService,
    progressRepo?: WorkStageProgressRepository,
  ) {
    this.progressRepo = progressRepo || new PrismaWorkStageProgressRepository(this.cacheService);
  }

  async saveProgress(
    progress: Partial<WorkStageProgress>,
  ): Promise<WorkStageProgress> {
    return this.progressRepo.save(progress);
  }

  async create(data: CreateWorkStageDTO): Promise<WorkStage> {
    const result = await prisma.workStage.create({
      data: {
        name: data.name,
        description: data.description || null,
        siteId: data.siteId,
        projectId: data.projectId,
        displayOrder: data.displayOrder || 0,
        weight: data.weight || 1.0,
        parentId: data.parentId || null,
        productionActivityId: data.productionActivityId,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
      },
    });
    await this.invalidateCache();
    return this.mapToWorkStage(result);
  }

  async update(
    id: string,
    data: Partial<CreateWorkStageDTO>,
  ): Promise<WorkStage> {
    // Map DTO to Prisma Update Input
    const prismaData: unknown = { ...data };

    // Explicitly handle relationship removals or updates if needed
    if (data.projectId === null) prismaData.projectId = null;
    if (data.siteId === null) prismaData.siteId = null;

    const result = await prisma.workStage.update({
      where: { id },
      data: prismaData as Prisma.WorkStageUpdateInput,
    });
    await this.invalidateCache();
    return this.mapToWorkStage(result);
  }

  async delete(id: string): Promise<void> {
    await prisma.workStage.delete({ where: { id } });
    await this.invalidateCache();
  }

  async reorder(
    updates: { id: string; displayOrder: number }[],
  ): Promise<void> {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.workStage.update({
          where: { id: update.id },
          data: { displayOrder: update.displayOrder },
        }),
      ),
    );
    await this.invalidateCache();
  }

  async deleteBySite(siteId: string): Promise<void> {
    await prisma.workStage.deleteMany({ where: { siteId } });
    await this.invalidateCache();
  }

  async updateMetadata(
    id: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await prisma.workStage.update({
      where: { id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheService.delByPattern("work_stages:list:*");
  }

  private mapToWorkStage(data: unknown): WorkStage {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      weight: Number(data.weight || 1.0),
      siteId: data.siteId,
      projectId: data.projectId,
      productionActivityId: data.productionActivityId,
      parentId: data.parentId,
      displayOrder: data.displayOrder,
      metadata: (data.metadata as Record<string, unknown>) || {},
      progress: (data.stageProgress ||
        data.progress ||
        []) as WorkStageProgress[],
    };
  }
}
