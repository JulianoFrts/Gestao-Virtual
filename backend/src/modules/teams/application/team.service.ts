import { TeamRepository, FindAllTeamsParams } from "../domain/team.repository";
import { getLaborClassification } from "@/lib/utils/laborUtils";
import { logger } from "@/lib/utils/logger";

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
          item.userId,
          item.teamId,
          tx,
        );
        if (member) results.push(member);
      }
    });

    return results;
  }

  private async validateAndCreateMember(
    userId: string,
    teamId: string,
    tx: any,
  ) {
    logger.debug("[TeamService] Validating and creating member:", { userId, teamId });

    // Garantir que a equipe existe
    const team = await tx.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      logger.error(`[TeamService] Team ${teamId} not found`);
      throw new Error(`Equipe com ID ${teamId} não encontrada`);
    }

    // Regra: Remover de qualquer outra equipe onde seja membro
    await tx.teamMember.deleteMany({ where: { userId } });

    // Regra: Remover de qualquer liderança
    await tx.team.updateMany({
      where: { supervisorId: userId },
      data: { supervisorId: null },
    });

    // Criar o membro com classificação correta
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { jobFunction: true },
    });

    if (!user) {
      logger.error(`[TeamService] User ${userId} not found`);
      throw new Error(`Usuário ${userId} não encontrado`);
    }

    const userLaborType = getLaborClassification(user.jobFunction?.name);

    if (team.laborType && team.laborType !== userLaborType) {
      logger.warn(`[TeamService] Labor mismatch for user ${user.name}: Expected ${team.laborType}, got ${userLaborType}`);
      throw new Error(
        `Incompatibilidade: A equipe é de ${team.laborType}, mas o funcionário é ${userLaborType}`,
      );
    }

    const result = await tx.teamMember.create({
      data: {
        userId,
        teamId,
      },
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

    logger.debug(`[TeamService] Member record created: ${result.id}`);
    return result;
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
    logger.debug("[TeamService] moveMember called", { employeeId, toTeamId });

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Remover de qualquer equipe (limpando o estado atual)
      const deleted = await tx.teamMember.deleteMany({
        where: { userId: employeeId },
      });
      logger.debug(`[TeamService] Deleted ${deleted.count} old memberships`);

      // 2. Remover de qualquer liderança
      const updated = await tx.team.updateMany({
        where: { supervisorId: employeeId },
        data: { supervisorId: null },
      });
      logger.debug(`[TeamService] Removed leadership from ${updated.count} teams`);

      // 3. Se houver equipe de destino, validar e criar
      if (toTeamId && toTeamId !== "null") {
        logger.debug(`[TeamService] Adding to target team: ${toTeamId}`);
        return await this.validateAndCreateMember(employeeId, toTeamId, tx);
      }

      logger.info(`[TeamService] Member ${employeeId} moved to Talent Pool`);
      return null;
    });
  }
}
