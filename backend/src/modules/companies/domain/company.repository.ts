import {
  CompanyEntity,
  CreateCompanyDTO,
  UpdateCompanyDTO,
} from "./company.dto";

export interface CompanyPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CompanyListResult {
  items: CompanyEntity[];
  pagination: CompanyPagination;
}

export interface CompanyRepository {
  findAll(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  }): Promise<CompanyListResult>;

  findById(id: string): Promise<CompanyEntity | null>;

  findByTaxId(taxId: string): Promise<CompanyEntity | null>;

  create(data: CreateCompanyDTO): Promise<CompanyEntity>;

  update(id: string, data: UpdateCompanyDTO): Promise<CompanyEntity>;

  delete(id: string): Promise<void>;
}
