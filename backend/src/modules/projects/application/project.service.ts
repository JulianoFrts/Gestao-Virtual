import { ProjectRepository } from "../domain/project.repository";
import { Prisma } from "@prisma/client";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async listProjects(params: {
    where: Prisma.ProjectWhereInput;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: string;
    include?: Prisma.ProjectInclude;
  }) {
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.repository.findAll({
        where: params.where,
        skip,
        take: params.limit,
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder || "asc" }
          : { createdAt: "desc" },
        include: params.include,
      }),
      this.repository.count(params.where),
    ]);

    return this.paginateResults(items, total, params.page, params.limit);
  }

  private paginateResults(
    items: any[],
    total: number,
    page: number,
    limit: number,
  ) {
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

  async getProjectById(id: string, include?: Prisma.ProjectInclude) {
    const project = await this.repository.findById(id, include);
    if (!project) throw new Error("Project not found");
    return project;
  }

  async createProject(
    data: Prisma.ProjectCreateInput,
    include?: Prisma.ProjectInclude,
  ) {
    return this.repository.create(data, include);
  }

  async updateProject(
    id: string,
    data: Prisma.ProjectUpdateInput,
    include?: Prisma.ProjectInclude,
  ) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Project not found");

    return this.repository.update(id, data, include);
  }

  async deleteProject(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Project not found");
    return this.repository.delete(id);
  }
  async getMonthlyTargets(where: any) {
    // Accessing prisma via repository wrapper
    const prisma = (this.repository as any).prisma;
    return prisma.projectMonthlyTarget.findMany({
      where,
      orderBy: { targetMonth: "asc" },
    });
  }

  async createMonthlyTarget(data: any) {
    const prisma = (this.repository as any).prisma;
    return prisma.projectMonthlyTarget.create({
      data: {
        ...data,
        targetMonth: new Date(data.targetMonth),
      },
    });
  }

  // Helper to build filters based on user role and query params
  // Move logic from route here or keep in route and pass constructed 'where' to service.
  // Encapsulation suggests service should know how to filter based on business rules?
  // Or maybe use a specific method `listProjectsForUser(user, filters)`.
  // For now, I'll keep the `where` construction in the route (Controller) as it deals with Request parsing and Auth Context -> Query translation,
  // OR move it here.
  // Let's keep `listProjects` taking `where` as it is flexible.
  async get3dCableSettings(projectId: string) {
    return this.repository.get3dCableSettings(projectId);
  }

  async upsert3dCableSettings(projectId: string, settings: any) {
    return this.repository.upsert3dCableSettings(projectId, settings);
  }
}
