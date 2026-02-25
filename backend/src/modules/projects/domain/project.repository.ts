import {
  ProjectEntity,
  ProjectFiltersDTO,
  CreateProjectDTO,
  UpdateProjectDTO,
} from "./project.dto";

export interface ProjectRepository {
  findAll(params: {
    where: ProjectFiltersDTO;
    skip: number;
    take: number;
    orderBy?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<ProjectEntity[]>;

  count(where: ProjectFiltersDTO): Promise<number>;

  findById(
    id: string,
    select?: Record<string, unknown>,
  ): Promise<ProjectEntity | null>;

  create(
    data: CreateProjectDTO,
    select?: Record<string, unknown>,
  ): Promise<ProjectEntity>;

  update(
    id: string,
    data: UpdateProjectDTO,
    select?: Record<string, unknown>,
  ): Promise<ProjectEntity>;

  delete(id: string): Promise<void>;

  get3dCableSettings(
    projectId: string,
  ): Promise<Record<string, unknown> | null>;
  upsert3dCableSettings(
    projectId: string,
    settings: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}
