export interface FindAllSitesParams {
  page: number;
  limit: number;
  projectId?: string;
  companyId?: string; // Para validação de acesso
  search?: string;
  isGlobalAccess?: boolean; // Para lógica de filtro
}

export interface SitesListResult {
  items: unknown[];
  total: number;
}

export interface SiteRepository {
  findAll(params: FindAllSitesParams): Promise<SitesListResult>;
  create(data: unknown): Promise<unknown>;
  count(where: unknown): Promise<number>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<void>;
}
