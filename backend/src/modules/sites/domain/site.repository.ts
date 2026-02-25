export interface FindAllSitesParams {
  page: number;
  limit: number;
  projectId?: string;
  companyId?: string; // Para validação de acesso
  search?: string;
  isGlobalAccess?: boolean; // Para lógica de filtro
}

export interface SitesListResult {
  items: any[];
  total: number;
}

export interface SiteRepository {
  findAll(params: FindAllSitesParams): Promise<SitesListResult>;
  create(data: any): Promise<any>;
  count(where: any): Promise<number>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
}
