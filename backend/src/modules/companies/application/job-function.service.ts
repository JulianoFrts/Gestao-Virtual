import { JobFunctionRepository } from "../domain/job-function.repository";
import { RandomProvider, SystemRandomProvider } from "@/lib/utils/random-provider";

export interface ListJobFunctionsParams {
  page: number;
  limit: number;
  companyId?: string;
  search?: string;
  isAdmin: boolean;
  currentUserCompanyId?: string;
}

export class JobFunctionService {
  constructor(
    private readonly repository: JobFunctionRepository,
    private readonly randomProvider: RandomProvider = new SystemRandomProvider(),
  ) {}

  async getJobFunctionById(id: string): Promise<any> {
    return this.repository.findFirst({ id });
  }

  async listJobFunctions(params: ListJobFunctionsParams): Promise<any> {
    const { page, limit, companyId, search, isAdmin, currentUserCompanyId } =
      params;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    // Se não for admin, vê as da sua empresa + as globais (templates)
    if (!isAdmin) {
      where.OR = [{ companyId: currentUserCompanyId }, { companyId: null }];
    } else if (companyId) {
      where.OR = [{ companyId: companyId }, { companyId: null }];
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

  async createJobFunction(data: unknown): Promise<any> {
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

    // Se o ID não for enviado, geramos um de forma determinística via provedor
    if (!data.id) {
      data.id = `jf_${this.randomProvider.string(9)}`;
    }

    return this.repository.create(data);
  }

  async deleteJobFunction(id: string): Promise<any> {
    const existing = await this.repository.findFirst({ id });
    if (!existing) {
      throw new Error("JOB_FUNCTION_NOT_FOUND");
    }

    return this.repository.delete(id);
  }

  async updateJobFunction(id: string, data: unknown): Promise<any> {
    const existing = await this.repository.findFirst({ id });
    if (!existing) {
      throw new Error("JOB_FUNCTION_NOT_FOUND");
    }

    // Business logic: check for duplicate name within same company if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.repository.findFirst({
        companyId:
          data.companyId !== undefined ? data.companyId : existing.companyId,
        name: data.name,
      });

      if (duplicate && duplicate.id !== id) {
        throw new Error("DUPLICATE_NAME");
      }
    }

    return this.repository.update(id, data);
  }
}
