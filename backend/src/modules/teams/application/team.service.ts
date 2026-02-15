import { TeamRepository, FindAllTeamsParams } from "../domain/team.repository";
import { getLaborClassification } from "@/lib/utils/laborUtils";

export class TeamService {
  constructor(private readonly repository: TeamRepository) { }

  private get prisma() {
    return (this.repository as any).prisma;
  }

  async listTeams(params: FindAllTeamsParams) {
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

  async getTeamById(id: string) {
    const team = await this.repository.findById(id);
    if (!team) throw new Error("Equipe não encontrada");
    return team;
  }

  async createTeam(data: any) {
    if (data.supervisorId) {
      return this.prisma.$transaction(async (tx: any) => {
        // 1. Remove from all memberships
        await tx.teamMember.deleteMany({ where: { userId: data.supervisorId } });

        // 2. Remove from any other leadership
        await tx.team.updateMany({
          where: { supervisorId: data.supervisorId },
          data: { supervisorId: null }
        });

        // 3. Create the team
        return tx.team.create({ data });
      });
    }
    return this.repository.create(data);
  }

  async updateTeam(id: string, data: any) {
    const team = await this.getTeamById(id);

    if (data.supervisorId && data.supervisorId !== team.supervisorId) {
      return this.prisma.$transaction(async (tx: any) => {
        // 1. Remove from all memberships
        await tx.teamMember.deleteMany({ where: { userId: data.supervisorId } });

        // 2. Remove from any other leadership
        await tx.team.updateMany({
          where: { supervisorId: data.supervisorId },
          data: { supervisorId: null }
        });

        // 3. Update the team
        return tx.team.update({
          where: { id },
          data
        });
      });
    }
    return this.repository.update(id, data);
  }

  async deleteTeam(id: string) {
    // Verify existence
    await this.getTeamById(id);
    return this.repository.delete(id);
  }

  // ==========================================
  // MEMBERSHIP LOGIC
  // ==========================================

  async listMembers(params: {
    teamId?: string;
    userId?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};
    if (params.teamId) where.teamId = params.teamId;
    if (params.userId) where.userId = params.userId;

    const skip = (params.page - 1) * params.limit;
    const take = params.limit;

    const [items, total] = await Promise.all([
      this.prisma.teamMember.findMany({
        where,
        skip,
        take,
        orderBy: { joinedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              authCredential: { select: { role: true, email: true } },
            },
          },
          team: { select: { id: true, name: true } },
        },
      }),
      this.prisma.teamMember.count({ where }),
    ]);

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

  async addMembersBatch(items: { teamId: string; userId: string }[]) {
    if (items.length === 0) return [];
    const results: any[] = [];

    await this.prisma.$transaction(async (tx: any) => {
      for (const item of items) {
        const member = await this.validateAndCreateMember(
          tx,
          item.teamId,
          item.userId
        );
        if (member) results.push(member);
      }
    });

    return results;
  }

  private async validateAndCreateMember(
    tx: any,
    teamId: string,
    userId: string,
  ) {
    if (!teamId || !userId) throw new Error("teamId and userId are required");

    const [user, team] = await Promise.all([
      tx.user.findUnique({
        where: { id: userId },
        include: { jobFunction: true },
      }),
      tx.team.findUnique({ where: { id: teamId } }),
    ]);

    if (!user) throw new Error(`Usuário ${userId} não encontrado`);
    if (!team) throw new Error(`Equipe ${teamId} não encontrada`);

    const userLaborType = getLaborClassification(
      user.jobFunction?.name || undefined,
    );
    if ((team as any).laborType && (team as any).laborType !== userLaborType) {
      throw new Error(
        `O funcionário ${user.name} é ${userLaborType}, mas a equipe ${team.name} é ${(team as any).laborType}`,
      );
    }

    // Regra: Remover de qualquer outra equipe onde seja membro
    await tx.teamMember.deleteMany({ where: { userId } });

    // Regra: Remover de qualquer liderança
    await tx.team.updateMany({
      where: { supervisorId: userId },
      data: { supervisorId: null },
    });

    const existing = await tx.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (existing) return null;

    return tx.teamMember.create({
      data: { teamId, userId },
      include: {
        team: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            name: true,
            authCredential: { select: { email: true } },
          },
        },
      },
    });
  }

  async removeMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (!member) return null;

    return this.prisma.teamMember.delete({
      where: { id: member.id },
    });
  }

  async removeAllMembers(teamId: string) {
    return this.prisma.teamMember.deleteMany({
      where: { teamId },
    });
  }

  async moveMember(employeeId: string, toTeamId: string | null) {
    return this.prisma.$transaction(async (tx: any) => {
      const employee = await tx.user.findUnique({
        where: { id: employeeId },
        include: { jobFunction: true },
      });

      if (!employee) throw new Error("Funcionário não encontrado");

      const employeeLaborType = getLaborClassification(
        employee.jobFunction?.name,
      );

      // 1. Remove from all team member lists
      await tx.teamMember.deleteMany({
        where: { userId: employeeId },
      });

      // 2. Remove from any leadership
      await tx.team.updateMany({
        where: { supervisorId: employeeId },
        data: { supervisorId: null },
      });

      // 3. Add to new team as member if toTeamId provided
      if (toTeamId && toTeamId !== "null") {
        const targetTeam = await tx.team.findUnique({
          where: { id: toTeamId },
        });
        if (!targetTeam) throw new Error("Equipe de destino não encontrada");

        if (
          targetTeam.laborType &&
          targetTeam.laborType !== employeeLaborType
        ) {
          throw new Error(
            `Incompatibilidade: Esta equipe é de ${targetTeam.laborType}, mas o funcionário é ${employeeLaborType}`,
          );
        }

        return await tx.teamMember.create({
          data: {
            userId: employeeId,
            teamId: toTeamId,
          },
        });
      }
      return null;
    });
  }
}
