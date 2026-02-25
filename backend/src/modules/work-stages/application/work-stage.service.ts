import {
  WorkStageRepository,
  WorkStage,
  CreateWorkStageDTO,
  CreateWorkStageBulkItem,
} from "../domain/work-stage.repository";
import { logger } from "@/lib/utils/logger";
import { WorkStageSecurityService } from "./work-stage-security.service";
import { WorkStageSyncManager } from "./work-stage-sync.manager";
import { WorkStageReorderService } from "./work-stage-reorder.service";

export class WorkStageService {
  private readonly security: WorkStageSecurityService;
  private readonly syncManager: WorkStageSyncManager;
  private readonly reorderService: WorkStageReorderService;

  constructor(private readonly repository: WorkStageRepository) {
    this.security = new WorkStageSecurityService(repository);
    this.syncManager = new WorkStageSyncManager(repository);
    this.reorderService = new WorkStageReorderService(repository);
  }

  async findAll(
    params: {
      siteId?: string | null;
      projectId?: string | null;
      companyId?: string | null;
      linkedOnly?: boolean;
    },
    securityContext?: any,
  ): Promise<WorkStage[]> {
    const siteId =
      !params.siteId ||
      ["all", "none", "undefined", "null"].includes(params.siteId)
        ? null
        : params.siteId;
    const projectId =
      !params.projectId ||
      ["all", "undefined", "null"].includes(params.projectId)
        ? null
        : params.projectId;

    let finalCompanyId = params.companyId;

    if (securityContext) {
      if (!(await this.security.isGlobal(securityContext))) {
        finalCompanyId = securityContext.companyId;
      }
    }

    if (!projectId && !siteId && !finalCompanyId) {
      return [];
    }

    return this.repository.findAll({
      ...params,
      siteId,
      projectId,
      companyId: finalCompanyId,
    });
  }

  async createStage(
    data: CreateWorkStageDTO,
    securityContext?: any,
  ): Promise<WorkStage> {
    if (!data.name) throw new Error("Name is required");

    const effectiveSiteId =
      !data.siteId || ["all", "none"].includes(data.siteId)
        ? null
        : data.siteId;
    const effectiveProjectId =
      !data.projectId || data.projectId === "all" ? null : data.projectId;

    if (!effectiveSiteId && !effectiveProjectId) {
      throw new Error("Site ID or Project ID is required");
    }

    await this.security.validateAccess(
      { siteId: effectiveSiteId, projectId: effectiveProjectId },
      securityContext,
    );

    let productionActivityId = data.productionActivityId;
    if (productionActivityId) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          productionActivityId,
        );
      if (!isUuid) {
        productionActivityId = null;
      } else {
        const exists =
          await this.repository.verifyActivityExists(productionActivityId);
        if (!exists) productionActivityId = null;
      }
    }

    return await this.repository.create({
      ...data,
      siteId: effectiveSiteId,
      projectId: effectiveProjectId,
      productionActivityId,
    });
  }

  async createBulk(
    projectId: string,
    siteId: string | undefined,
    data: CreateWorkStageBulkItem[],
    securityContext?: any,
  ): Promise<WorkStage[]> {
    if (!projectId || projectId === "all") {
      throw new Error("Project ID is required for bulk creation");
    }

    const effectiveSiteId =
      !siteId || ["all", "none"].includes(siteId) ? undefined : siteId;

    await this.security.validateAccess(
      { siteId: effectiveSiteId, projectId },
      securityContext,
    );

    return await this.repository.createBulk(projectId, effectiveSiteId, data);
  }

  async update(
    id: string,
    data: Partial<CreateWorkStageDTO>,
    securityContext?: any,
  ): Promise<WorkStage> {
    await this.security.validateStageAccess(id, securityContext);
    return await this.repository.update(id, data);
  }

  async syncStages(
    params: { siteId?: string; projectId?: string },
    companyId: string,
    securityContext: any,
  ): Promise<any[]> {
    const { siteId, projectId } = params;
    const isGlobal = await this.security.isGlobal(securityContext);

    logger.info(`Iniciando sincronização de etapas`, {
      source: "WorkStage/WorkStageService",
      siteId,
      projectId,
      companyId,
    });

    if (!isGlobal) {
      await this.security.validateAccess(
        { siteId, projectId },
        securityContext,
      );
    }

    const results = await this.syncManager.syncStagesOfScope(
      params,
      companyId,
      isGlobal,
    );

    if (projectId) {
      await this.reorderService.syncOrderWithGoals(projectId);
    }

    return results;
  }

  async delete(id: string, securityContext?: any): Promise<void> {
    await this.security.validateStageAccess(id, securityContext);
    return await this.repository.delete(id);
  }

  async deleteBySite(siteId: string, securityContext?: any): Promise<void> {
    await this.security.validateAccess({ siteId }, securityContext);
    return await this.repository.deleteBySite(siteId);
  }

  async reorder(
    updates: { id: string; displayOrder: number }[],
    securityContext?: any,
  ): Promise<void> {
    if (securityContext) {
      await this.security.validateStageAccessBulk(
        updates.map((u) => u.id),
        securityContext,
      );
    }

    return await this.reorderService.reorder(updates);
  }
}
