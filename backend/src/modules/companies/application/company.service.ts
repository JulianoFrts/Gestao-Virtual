import { CompanyRepository } from "../domain/company.repository";

export class CompanyService {
  constructor(private readonly repository: CompanyRepository) {}

  async listCompanies(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  }) {
    return this.repository.findAll(params);
  }

  async getCompanyById(id: string) {
    const company = await this.repository.findById(id);
    if (!company) throw new Error("Company not found");
    return company;
  }

  async createCompany(data: unknown) {
    if (data.taxId) {
      const existing = await this.repository.findByTaxId(data.taxId);
      if (existing) throw new Error("CNPJ/CPF já cadastrado");
    }
    return this.repository.create(data);
  }

  async updateCompany(id: string, data: unknown) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Company not found");
    return this.repository.update(id, data);
  }

  async deleteCompany(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Company not found");
    return this.repository.delete(id);
  }
}
