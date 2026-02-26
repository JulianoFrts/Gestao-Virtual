import { prisma } from "@/lib/prisma/client";
import {
  TeamRepository,
  FindAllTeamsParams,
  TeamsListResult,
} from "../domain/team.repository";
import { ICacheService } from "@/services/cache.interface";
import { cacheService } from "@/services/cacheService"; // Fallback para manter a interface atual de instanciacao
import { getLaborClassification } from "@/lib/utils/laborUtils";

export class PrismaTeamRepository implements TeamRepository {
  private readonly CACHE_PREFIX = "teams:";

  constructor(private readonly cache: ICacheService = cacheService) {}

  async findAll(params: FindAllTeamsParams): Promise<TeamsListResult> {
    const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify(params)}`;
    const cached = await this.cache.get<TeamsListResult>(cacheKey);
    if (cached) return cached;

    const skip = (params.page - 1) * params.limit;
    const where: unknown = {};

    if (params.companyId) where.companyId = params.companyId;
    if (params.siteId) where.siteId = params.siteId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.name)
      where.name = { contains: params.name, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { displayOrder: "asc" },
        include: {
          company: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          supervisor: { select: { id: true, name: true } },
          teamMembers: { select: { userId: true } },
          _count: { select: { teamMembers: true } },
        },
      }),
      prisma.team.count({ where }),
    ]);

    const result = { items, total };
    await this.cache.set(cacheKey, result, 300); // 5 minutes cache
    return result;
  }

  async findById(id: string): Promise<any | null> {
    return prisma.team.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                authCredential: { select: { role: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: unknown): Promise<unknown> {
    const result = await prisma.team.create({
      data,
      include: {
        supervisor: { select: { id: true, name: true } },
      },
    });
    await this.invalidateCache();
    return result;
  }

  async update(id: string, data: unknown): Promise<unknown> {
    const result = await prisma.team.update({
      where: { id },
      data,
    });
    await this.invalidateCache();
    return result;
  }

  async delete(id: string): Promise<unknown> {
    const result = await prisma.team.delete({
      where: { id },
    });
    await this.invalidateCache();
    return result;
  }

  async setSupervisorAtomic(
    teamId: string,
    supervisorId: string,
  ): Promise<unknown> {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Remove employee from all memberships (Líder não é membro)
      await tx.teamMember.deleteMany({
        where: { userId: supervisorId },
      });

      // 2. Remove employee from any other leadership
      await tx.team.updateMany({
        where: { supervisorId: supervisorId },
        data: { supervisorId: null },
      });

      // 3. Update the targeted team
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: { supervisorId },
        include: {
          supervisor: { select: { id: true, name: true } },
        },
      });

      return updatedTeam;
    });

    await this.invalidateCache();
    return result;
  }

  async moveMemberAtomic(
    employeeId: string,
    toTeamId: string | null,
  ): Promise<unknown> {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Remove from all memberships
      await tx.teamMember.deleteMany({ where: { userId: employeeId } });

      // 2. Always clear leadership (Mutual Exclusivity)
      await tx.team.updateMany({
        where: { supervisorId: employeeId },
        data: { supervisorId: null },
      });

      // 3. If toTeamId, add to new team as member
      if (toTeamId && toTeamId !== "null") {
        return await this.validateAndCreateMember(
          employeeId,
          toTeamId,
          tx as unknown,
        );
      }
      return null;
    });

    await this.invalidateCache();
    return result;
  }

  async listMembers(params: unknown): Promise<unknown> {
    const skip = (params.page - 1) * params.limit;
    const where: unknown = {};
    if (params.teamId) where.teamId = params.teamId;
    if (params.userId) where.userId = params.userId;

    const [items, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        skip,
        take: params.limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              affiliation: { select: { registrationNumber: true } },
            },
          },
          team: { select: { id: true, name: true } },
        },
      }),
      prisma.teamMember.count({ where }),
    ]);

    return { items, total };
  }

  async removeMember(teamId: string, userId: string): Promise<unknown> {
    const member = await prisma.teamMember.findFirst({
      where: { teamId, userId },
    });
    if (!member) return null;

    const result = await prisma.teamMember.delete({
      where: { id: member.id },
    });
    await this.invalidateCache();
    return result;
  }

  async removeAllMembers(teamId: string): Promise<unknown> {
    const result = await prisma.teamMember.deleteMany({
      where: { teamId },
    });
    await this.invalidateCache();
    return result;
  }

  async addMembersBatch(
    items: { teamId: string; userId: string }[],
  ): Promise<any[]> {
    const results: unknown[] = [];
    await prisma.$transaction(async (tx) => {
      for (const element of items) {
        const member = await this.validateAndCreateMember(
          element.userId,
          element.teamId,
          tx as unknown,
        );
        if (member) results.push(member);
      }
    });
    await this.invalidateCache();
    return results;
  }

  private async validateAndCreateMember(
    userId: string,
    teamId: string,
    tx: unknown,
  ) {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error(`Equipe com ID ${teamId} não encontrada`);

    // Regra: Remover de qualquer outra equipe onde seja membro
    await tx.teamMember.deleteMany({ where: { userId } });

    // Regra: Se está virando membro, NÃO pode ser líder de NENHUMA equipe
    await tx.team.updateMany({
      where: { supervisorId: userId },
      data: { supervisorId: null },
    });

    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { jobFunction: true },
    });

    if (!user) throw new Error(`Usuário ${userId} não encontrado`);

    const userLaborType = getLaborClassification(user.jobFunction?.name);
    if (team.laborType && team.laborType !== userLaborType) {
      throw new Error(
        `Incompatibilidade: A equipe é de ${team.laborType}, mas o funcionário ${user.name} é do tipo ${userLaborType}`,
      );
    }

    return await tx.teamMember.create({
      data: { userId, teamId },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  private async invalidateCache(): Promise<void> {
    await this.cache.delByPattern(`${this.CACHE_PREFIX}*`);
  }

  async count(where: unknown): Promise<number> {
    return prisma.team.count({ where });
  }
}
