import { JobFunctionRepository } from "../domain/job-function.repository";

export interface ListJobFunctionsParams {
  page: number;
  limit: number;
  companyId?: string;
  search?: string;
  isAdmin: boolean;
  currentUserCompanyId?: string;
}

export class JobFunctionService {
  constructor(private readonly repository: JobFunctionRepository) {}

  async listJobFunctions(params: ListJobFunctionsParams) {
    const { page, limit, companyId, search, isAdmin, currentUserCompanyId } =
      params;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    // Se não for admin, vê as da sua empresa + as globais (templates)
    // Se for admin e pediu uma empresa específica, vê essa empresa + globais? 
    // O usuário disse: "qualquer empresas copiar e usar em sua empresa"
    if (!isAdmin) {
      where.OR = [
        { companyId: currentUserCompanyId },
        { companyId: null }
      ];
    } else if (companyId) {
      where.OR = [
        { companyId: companyId },
        { companyId: null }
      ];
    } else {
      // Admin sem filtro vê tudo (incluindo modelos)
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      this.repository.findAll(where, skip, limit, [
        { hierarchyLevel: "desc" },
        { name: "asc" },
      ]),
      this.repository.count(where),
    ]);

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

  async createJobFunction(data: any) {
    // Se tiver companyId, verifica se empresa existe
    if (data.companyId) {
      const companyExists = await this.repository.checkCompanyExists(
        data.companyId,
      );
      if (!companyExists) {
        throw new Error("COMPANY_NOT_FOUND");
      }
    }

    // Business logic: check for duplicate name within same company or globally if companyId is null
    const existing = await this.repository.findFirst({
      companyId: data.companyId || null,
      name: data.name,
    });

    if (existing) {
      throw new Error("DUPLICATE_NAME");
    }

    return this.repository.create(data);
  }

  async deleteJobFunction(id: string) {
    const existing = await this.repository.findFirst({ id });
    if (!existing) {
      throw new Error("JOB_FUNCTION_NOT_FOUND");
    }

    return this.repository.delete(id);
  }
}
