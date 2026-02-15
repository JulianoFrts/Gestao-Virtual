export interface FindAllTeamsParams {
  page: number;
  limit: number;
  companyId?: string;
  siteId?: string;
  isActive?: boolean;
  name?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface TeamsListResult {
  items: any[];
  total: number;
}

export interface TeamRepository {
  findAll(params: FindAllTeamsParams): Promise<TeamsListResult>;
  findById(id: string): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<any>;

  // Optional count method if needed separately, but findAll returns total
  count?(where: any): Promise<number>;
}
