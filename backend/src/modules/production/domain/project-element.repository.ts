export interface ProjectElementRepository {
  findById(id: string): Promise<any | null>;
  findByIds(ids: string[]): Promise<any[]>;
  findByProjectId(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
  ): Promise<any[]>;
  findLinkedActivityIds(projectId: string, siteId?: string): Promise<string[]>;
  findProjectId(elementId: string): Promise<string | null>;
  findCompanyId(elementId: string): Promise<string | null>;
}
