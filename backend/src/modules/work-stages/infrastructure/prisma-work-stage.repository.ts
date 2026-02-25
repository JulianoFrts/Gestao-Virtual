import {
  WorkStageRepository,
  WorkStage,
  CreateWorkStageDTO,
  CreateWorkStageBulkItem,
  WorkStageReadRepository,
  WorkStageWriteRepository,
  WorkStageBulkRepository,
} from "../domain/work-stage.repository";
import { WorkStageProgress } from "../domain/work-stage-progress.repository";
import { PrismaWorkStageReadRepository } from "./prisma-work-stage-read.repository";
import { PrismaWorkStageWriteRepository } from "./prisma-work-stage-write.repository";
import { PrismaWorkStageBulkRepository } from "./prisma-work-stage-bulk.repository";
import { ICacheService } from "@/services/cache.interface";
import { cacheService } from "@/services/cacheService"; // Fallback para manter compatibilidade, mas idealmente seria injetado da raiz

export class PrismaWorkStageRepository implements WorkStageRepository {
  private readonly readRepo: WorkStageReadRepository;
  private readonly writeRepo: WorkStageWriteRepository;
  private readonly bulkRepo: WorkStageBulkRepository;

  constructor(
    cache: ICacheService = cacheService,
    readRepo?: WorkStageReadRepository,
    writeRepo?: WorkStageWriteRepository,
    bulkRepo?: WorkStageBulkRepository,
  ) {
    this.readRepo = readRepo || new PrismaWorkStageReadRepository(cache);
    this.writeRepo = writeRepo || new PrismaWorkStageWriteRepository(cache);
    this.bulkRepo = bulkRepo || new PrismaWorkStageBulkRepository(cache);
  }

  // --- Read Operations ---
  async findLinkedStagesBySite(
    siteId: string,
    companyId?: string,
  ): Promise<WorkStage[]> {
    return this.readRepo.findLinkedStagesBySite(siteId, companyId);
  }

  async findLinkedStagesByProjectId(
    projectId: string,
    companyId?: string,
  ): Promise<WorkStage[]> {
    return this.readRepo.findLinkedStagesByProjectId(projectId, companyId);
  }

  async findProgressByDate(
    stageId: string,
    date: Date,
  ): Promise<WorkStageProgress | null> {
    return this.readRepo.findProgressByDate(stageId, date);
  }

  async findAll(params: {
    siteId?: string | null;
    projectId?: string | null;
    companyId?: string | null;
    linkedOnly?: boolean;
  }): Promise<WorkStage[]> {
    return this.readRepo.findAll(params);
  }

  async findAllBySiteId(siteId: string): Promise<WorkStage[]> {
    return this.readRepo.findAllBySiteId(siteId);
  }

  async findAllByProjectId(projectId: string): Promise<WorkStage[]> {
    return this.readRepo.findAllByProjectId(projectId);
  }

  async listProgress(stageId?: string): Promise<WorkStageProgress[]> {
    return this.readRepo.listProgress(stageId);
  }

  async findProductionElements(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{ total: number; executed: number; sumProgress: number }> {
    return this.readRepo.findProductionElements(
      projectId,
      activityId,
      siteName,
    );
  }

  async findProductionElementsWeighted(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{
    totalWeight: number;
    weightedProgress: number;
    totalCount: number;
    executedCount: number;
  }> {
    return this.readRepo.findProductionElementsWeighted(
      projectId,
      activityId,
      siteName,
    );
  }

  async verifyActivityExists(activityId: string): Promise<boolean> {
    return this.readRepo.verifyActivityExists(activityId);
  }

  async findById(id: string): Promise<WorkStage | null> {
    return this.readRepo.findById(id);
  }

  async verifySiteAccess(siteId: string, companyId: string): Promise<boolean> {
    return this.readRepo.verifySiteAccess(siteId, companyId);
  }

  async verifyProjectAccess(
    projectId: string,
    companyId: string,
  ): Promise<boolean> {
    return this.readRepo.verifyProjectAccess(projectId, companyId);
  }

  async verifyStageAccess(
    stageId: string,
    companyId: string,
  ): Promise<boolean> {
    return this.readRepo.verifyStageAccess(stageId, companyId);
  }

  async verifyStageAccessBulk(
    ids: string[],
    companyId: string,
  ): Promise<boolean> {
    return this.readRepo.verifyStageAccessBulk(ids, companyId);
  }

  async getMetadata(id: string): Promise<Record<string, unknown>> {
    return this.readRepo.getMetadata(id);
  }

  async findGoalsByProject(
    projectId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.readRepo.findGoalsByProject(projectId);
  }

  // --- Write Operations ---
  async saveProgress(
    progress: Partial<WorkStageProgress>,
  ): Promise<WorkStageProgress> {
    return this.writeRepo.saveProgress(progress);
  }

  async create(data: CreateWorkStageDTO): Promise<WorkStage> {
    return this.writeRepo.create(data);
  }

  async update(
    id: string,
    data: Partial<CreateWorkStageDTO>,
  ): Promise<WorkStage> {
    return this.writeRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.writeRepo.delete(id);
  }

  async reorder(
    updates: { id: string; displayOrder: number }[],
  ): Promise<void> {
    return this.writeRepo.reorder(updates);
  }

  async deleteBySite(siteId: string): Promise<void> {
    return this.writeRepo.deleteBySite(siteId);
  }

  async updateMetadata(
    id: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    return this.writeRepo.updateMetadata(id, metadata);
  }

  // --- Bulk Operations ---
  async createBulk(
    projectId: string,
    siteId: string | undefined,
    data: CreateWorkStageBulkItem[],
  ): Promise<WorkStage[]> {
    return this.bulkRepo.createBulk(projectId, siteId, data);
  }
}
