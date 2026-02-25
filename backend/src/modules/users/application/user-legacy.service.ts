import { UserRepository } from "../domain/user.repository";
import { UserEntity } from "../domain/user.dto";

export class UserLegacyService {
  constructor(private readonly repository: UserRepository) {}

  async listLegacyEmployees(): Promise<Record<string, unknown>[]> {
    const users = await this.repository.findAll({
      where: {},
      skip: 0,
      take: 100,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        cpf: true,
        phone: true,
        affiliation: {
          select: { companyId: true, projectId: true, siteId: true },
        },
        functionId: true,
        hierarchyLevel: true,
        authCredential: {
          select: { role: true, status: true, email: true },
        },
        createdAt: true,
        updatedAt: true,
        jobFunction: {
          select: { name: true, hierarchyLevel: true, canLeadTeam: true },
        },
      },
    });

    return users.map((user: UserEntity) => ({
      id: user.id,
      full_name: user.name,
      email: user.authCredential?.email || "",
      registration_number: user.registrationNumber,
      cpf: user.cpf,
      phone: user.phone,
      company_id: user.affiliation?.companyId,
      project_id: user.affiliation?.projectId,
      labor_type: user.laborType,
      site_id: user.affiliation?.siteId,
      function_id: user.functionId,
      hierarchy_level: user.hierarchyLevel,
      status: user.authCredential?.status || "ACTIVE",
      role: user.authCredential?.role || "WORKER",
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      job_functions: user.jobFunction
        ? {
            name: user.jobFunction.name,
            level: user.jobFunction.hierarchyLevel,
            can_lead_team: user.jobFunction.canLeadTeam,
          }
        : null,
    }));
  }

  async listLegacyProfiles(params: {
    page: number;
    limit: number;
  }): Promise<Record<string, unknown>[]> {
    const skip = (params.page - 1) * params.limit;
    const users = await this.repository.findAll({
      where: {},
      skip,
      take: params.limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        cpf: true,
        phone: true,
        affiliation: {
          select: { companyId: true, projectId: true, siteId: true },
        },
        functionId: true,
        hierarchyLevel: true,
        authCredential: {
          select: { role: true, status: true, email: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Import dinâmico para evitar dependência circular se necessário
    const { Role: LegacyRole } = await import("@/types/database");

    return users.map((user: UserEntity) => ({
      id: user.id,
      full_name: user.name,
      email: user.authCredential?.email || "",
      registration_number: user.registrationNumber,
      phone: user.phone,
      company_id: user.affiliation?.companyId,
      project_id: user.affiliation?.projectId,
      labor_type: user.laborType,
      site_id: user.affiliation?.siteId,
      function_id: user.functionId,
      hierarchy_level: user.hierarchyLevel,
      is_blocked: (user.authCredential?.status || "ACTIVE") !== "ACTIVE",
      is_system_admin:
        (user.authCredential?.role || "WORKER") === LegacyRole.ADMIN,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    }));
  }
}
