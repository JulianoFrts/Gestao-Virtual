import { UserRepository } from "../domain/user.repository";
import { UserEntity } from "../domain/user.dto";
import { prisma as globalPrisma } from "@/lib/prisma/client";

export class UserLegacyService {
  constructor(
    private readonly repository: UserRepository,
    private readonly prisma = globalPrisma,
  ) {}

  async deleteUserRelations(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.account.deleteMany({ where: { userId: id } }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
      this.prisma.auditLog.deleteMany({ where: { userId: id } }),
      this.prisma.teamMember.deleteMany({ where: { userId: id } }),
      this.prisma.timeRecord.deleteMany({ where: { userId: id } }),
      this.prisma.dailyReport.deleteMany({ where: { userId: id } }),
      this.prisma.constructionDocument.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      }),
      this.prisma.activitySchedule.deleteMany({ where: { createdBy: id } }),
      this.prisma.team.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null },
      }),
    ]);
  }

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

    return users.map((user: UserEntity) => {
      const aff = user.affiliation || ({} as unknown);
      return {
        id: user.id,
        full_name: user.name,
        email: user.authCredential?.email || "",
        registration_number: aff.registrationNumber,
        cpf: user.cpf,
        phone: user.phone,
        company_id: aff.companyId,
        project_id: aff.projectId,
        labor_type: aff.laborType,
        site_id: aff.siteId,
        function_id: aff.functionId,
        hierarchy_level: aff.hierarchyLevel,
        status: user.authCredential?.status || "ACTIVE",
        role: user.authCredential?.role || "OPERATIONAL",
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        job_functions: aff.jobFunction
          ? {
              name: aff.jobFunction.name,
              level: aff.hierarchyLevel,
              can_lead_team: aff.jobFunction.canLeadTeam,
            }
          : null,
      };
    });
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

    return users.map((user: UserEntity) => {
      const aff = user.affiliation || ({} as unknown);
      return {
        id: user.id,
        full_name: user.name,
        email: user.authCredential?.email || "",
        registration_number: aff.registrationNumber,
        phone: user.phone,
        company_id: aff.companyId,
        project_id: aff.projectId,
        labor_type: aff.laborType,
        site_id: aff.siteId,
        function_id: aff.functionId,
        hierarchy_level: aff.hierarchyLevel,
        is_blocked: (user.authCredential?.status || "ACTIVE") !== "ACTIVE",
        is_system_admin:
          (user.authCredential?.role || "OPERATIONAL") === LegacyRole.ADMIN || user.authCredential?.isSystemAdmin,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      };
    });
  }
}
