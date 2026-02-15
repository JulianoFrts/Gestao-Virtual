export interface CompanyPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CompanyListResult {
  items: any[];
  pagination: CompanyPagination;
}

export interface CompanyRepository {
  findAll(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  }): Promise<CompanyListResult>;

  findById(id: string): Promise<any | null>;

  findByTaxId(taxId: string): Promise<any | null>;

  create(data: any): Promise<any>;

  update(id: string, data: any): Promise<any>;

  delete(id: string): Promise<void>;
}
