import { ProjectRepository } from "../domain/project.repository";
import {
  ProjectEntity,
  ProjectFiltersDTO,
  CreateProjectDTO,
  UpdateProjectDTO,
} from "../domain/project.dto";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async listProjects(params: {
    where: ProjectFiltersDTO;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: string;
    include?: Record<string, unknown>;
  }): Promise<{
    items: ProjectEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.repository.findAll({
        where: params.where,
        skip,
        take: params.limit,
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder || "asc" }
          : { createdAt: "desc" },
        select: params.include,
      }),
      this.repository.count(params.where),
    ]);

    return this.paginateResults(items, total, params.page, params.limit);
  }

  private paginateResults(
    items: ProjectEntity[],
    total: number,
    page: number,
    limit: number,
  ): {
    items: ProjectEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const pages = Math.ceil(total / limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async getProjectById(
    id: string,
    include?: Record<string, unknown>,
  ): Promise<ProjectEntity> {
    const project = await this.repository.findById(id, include);
    if (!project) throw new Error("Project not found");
    return project;
  }

  async createProject(
    data: CreateProjectDTO,
    include?: Record<string, unknown>,
  ): Promise<ProjectEntity> {
    return this.repository.create(data, include);
  }

  async updateProject(
    id: string,
    data: UpdateProjectDTO,
    include?: Record<string, unknown>,
  ): Promise<ProjectEntity> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Project not found");

    return this.repository.update(id, data, include);
  }

  async deleteProject(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Project not found");
    return this.repository.delete(id);
  }

  async getMonthlyTargets(
    where: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    // TODO: Migrar para método no Repository (DIP)
    const prisma = (this.repository as { prisma?: Record<string, unknown> })
      .prisma;
    if (!prisma) throw new Error("prisma not available on repository");
    const model = prisma["projectMonthlyTarget"] as {
      findMany: (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>[]>;
    };
    return model.findMany({
      where,
      orderBy: { targetMonth: "asc" },
    });
  }

  async createMonthlyTarget(data: {
    targetMonth: string;
    [key: string]: unknown;
  }): Promise<Record<string, unknown>> {
    const prisma = (this.repository as { prisma?: Record<string, unknown> })
      .prisma;
    if (!prisma) throw new Error("prisma not available on repository");
    const model = prisma["projectMonthlyTarget"] as {
      create: (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
    };
    return model.create({
      data: {
        ...data,
        targetMonth: new Date(data.targetMonth),
      },
    });
  }

  async get3dCableSettings(
    projectId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.repository.get3dCableSettings(projectId);
  }

  async upsert3dCableSettings(
    projectId: string,
    settings: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.repository.upsert3dCableSettings(projectId, settings);
  }
}
