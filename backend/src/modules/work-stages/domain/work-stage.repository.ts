import { WorkStageProgress } from "./work-stage-progress.repository";

export type { WorkStageProgress };

export interface WorkStage {
  id: string;
  name: string;
  description?: string | null;
  weight?: number;
  siteId: string | null;
  projectId: string | null;
  productionActivityId: string | null;
  parentId?: string | null;
  displayOrder: number;
  metadata?: Record<string, unknown>;
  site?: {
    projectId: string;
    name: string;
    project?: {
      companyId: string;
    };
  } | null;

  progress?: WorkStageProgress[];
}

export interface CreateWorkStageDTO {
  name: string;
  description?: string | null;
  siteId: string | null;
  projectId?: string | null;
  displayOrder: number;
  weight?: number;
  parentId?: string | null;
  productionActivityId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateWorkStageBulkItem {
  name: string;
  description?: string | null;
  weight?: number;
  displayOrder: number;
  productionActivityId?: string | null;
  metadata?: Record<string, unknown>;
  children?: CreateWorkStageBulkItem[];
}

export interface WorkStageFinder {
  findAll(params: {
    siteId?: string | null;
    projectId?: string | null;
    companyId?: string | null;
    linkedOnly?: boolean;
  }): Promise<WorkStage[]>;
  findAllBySiteId(siteId: string): Promise<WorkStage[]>;
  findAllByProjectId(projectId: string): Promise<WorkStage[]>;
  findById(id: string): Promise<WorkStage | null>;
  findLinkedStagesBySite(siteId: string, companyId?: string): Promise<WorkStage[]>;
  findLinkedStagesByProjectId(projectId: string, companyId?: string): Promise<WorkStage[]>;
}

export interface WorkStageProgressReader {
  findProgressByDate(stageId: string, date: Date): Promise<WorkStageProgress | null>;
  listProgress(stageId?: string): Promise<WorkStageProgress[]>;
}

export interface WorkStageProductionReader {
  findProductionElements(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{ total: number; executed: number; sumProgress: number }>;
  findProductionElementsWeighted(
    projectId: string,
    activityId: string,
    siteName?: string,
  ): Promise<{
    totalWeight: number;
    weightedProgress: number;
    totalCount: number;
    executedCount: number;
  }>;
  verifyActivityExists(activityId: string): Promise<boolean>;
}

export interface WorkStageAccessVerifier {
  verifySiteAccess(siteId: string, companyId: string): Promise<boolean>;
  verifyProjectAccess(projectId: string, companyId: string): Promise<boolean>;
  verifyStageAccess(stageId: string, companyId: string): Promise<boolean>;
  verifyStageAccessBulk(ids: string[], companyId: string): Promise<boolean>;
}

export interface WorkStageReadRepository 
  extends WorkStageFinder, WorkStageProgressReader, WorkStageProductionReader, WorkStageAccessVerifier {
  getMetadata(id: string): Promise<Record<string, unknown>>;
  findGoalsByProject(projectId: string): Promise<Record<string, unknown>[]>;
}

export interface WorkStageWriteRepository {
  saveProgress(
    progress: Partial<WorkStageProgress>,
  ): Promise<WorkStageProgress>;
  create(data: CreateWorkStageDTO): Promise<WorkStage>;
  update(id: string, data: Partial<CreateWorkStageDTO>): Promise<WorkStage>;
  delete(id: string): Promise<void>;
  reorder(updates: { id: string; displayOrder: number }[]): Promise<void>;
  deleteBySite(siteId: string): Promise<void>;
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void>;
}

export interface WorkStageBulkRepository {
  createBulk(
    projectId: string,
    siteId: string | undefined,
    data: CreateWorkStageBulkItem[],
  ): Promise<WorkStage[]>;
}

export interface WorkStageRepository
  extends
    WorkStageReadRepository,
    WorkStageWriteRepository,
    WorkStageBulkRepository {}
