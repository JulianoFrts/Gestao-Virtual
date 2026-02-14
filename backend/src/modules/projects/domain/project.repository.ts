import { Project, Prisma } from "@prisma/client";

export interface ProjectRepository {
  findAll(params: {
    where: Prisma.ProjectWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.ProjectOrderByWithRelationInput;
    include?: Prisma.ProjectInclude;
  }): Promise<Partial<Project>[]>;

  count(where: Prisma.ProjectWhereInput): Promise<number>;

  findById(
    id: string,
    include?: Prisma.ProjectInclude,
  ): Promise<Partial<Project> | null>;

  create(
    data: Prisma.ProjectCreateInput,
    include?: Prisma.ProjectInclude,
  ): Promise<Partial<Project>>;

  update(
    id: string,
    data: Prisma.ProjectUpdateInput,
    include?: Prisma.ProjectInclude,
  ): Promise<Partial<Project>>;

  delete(id: string): Promise<void>;

  get3dCableSettings(projectId: string): Promise<any>;
  upsert3dCableSettings(projectId: string, settings: any): Promise<any>;
}
