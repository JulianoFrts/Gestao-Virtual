import { TeamRepository, FindAllTeamsParams } from "../domain/team.repository";
import { logger } from "@/lib/utils/logger";

export class TeamService {
  constructor(private readonly repository: TeamRepository) {}

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
    const team = await this.repository.create(data);

    if (data.supervisorId) {
      // Enforce mutual exclusivity rules (Líder não é membro, Líder de apenas uma equipe)
      return this.repository.setSupervisorAtomic(team.id, data.supervisorId);
    }

    return team;
  }

  async updateTeam(id: string, data: any) {
    const { supervisorId, ...updateData } = data;
    let result;

    if (Object.keys(updateData).length > 0) {
      result = await this.repository.update(id, updateData);
    }

    if (supervisorId !== undefined) {
      result = await this.repository.setSupervisorAtomic(id, supervisorId);
    }

    return result || this.getTeamById(id);
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
    const { items, total } = await this.repository.listMembers(params);
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
    return this.repository.addMembersBatch(items);
  }

  async removeMember(teamId: string, userId: string) {
    return this.repository.removeMember(teamId, userId);
  }

  async removeAllMembers(teamId: string) {
    return this.repository.removeAllMembers(teamId);
  }

  async moveMember(employeeId: string, toTeamId: string | null) {
    logger.debug("[TeamService] moveMember called", { employeeId, toTeamId });
    return this.repository.moveMemberAtomic(employeeId, toTeamId);
  }
}
