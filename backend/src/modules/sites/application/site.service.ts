import { SiteRepository, FindAllSitesParams } from "../domain/site.repository";
import { prisma } from "@/lib/prisma/client"; // Acesso direto necessário apenas para validações extras se o repo não cobrir, mas validaremos projeto aqui.

export class SiteService {
  constructor(private readonly repository: SiteRepository) {}

  async listSites(params: FindAllSitesParams) {
    // Validação de acesso ao projeto específico (Regra de Negócio)
    if (params.projectId && !params.isGlobalAccess && params.companyId) {
      const project = await prisma.project.findFirst({
        where: { id: params.projectId, companyId: params.companyId },
      });
      if (!project) throw new Error("Projeto não encontrado ou acesso negado");
    }

    const { items, total } = await this.repository.findAll(params);
    const pages = Math.ceil(total / params.limit);

    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages,
        hasNext: params.page < pages,
        hasPrev: params.page > 1,
      },
    };
  }

  async getSiteById(id: string) {
    const site = await this.repository.findById(id);
    if (!site) throw new Error("Site não encontrado");
    return site;
  }

  async createSite(data: any) {
    // Validação de existência do projeto
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });
    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    return this.repository.create(data);
  }

  async updateSite(id: string, data: any) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Site não encontrado");
    return this.repository.update(id, data);
  }

  async deleteSite(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Site não encontrado");
    return this.repository.delete(id);
  }
}
