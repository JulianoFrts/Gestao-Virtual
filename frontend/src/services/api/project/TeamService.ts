/**
 * Team Service
 * 
 * Service para operações de equipe com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
import { orionApi } from '@/integrations/orion/client';
import {
    TeamSchema,
    CreateTeamSchema,
    UpdateTeamSchema,
    TeamMemberSchema,
    type Team,
    type CreateTeam,
    type UpdateTeam,
    type TeamMember
} from '@/models/schemas';

export interface TeamEntity extends Team {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    members?: TeamMember[];
}

class TeamService extends BaseApiService<TeamEntity, CreateTeam, UpdateTeam> {
    protected tableName = 'teams';
    protected createSchema = CreateTeamSchema;
    protected updateSchema = UpdateTeamSchema;

    /**
     * Busca equipes por supervisor
     */
    async getBySupervisor(supervisorId: string): Promise<ServiceResult<TeamEntity[]>> {
        return this.findBy('supervisorId', supervisorId);
    }

    /**
     * Busca equipes por projeto
     */
    async getByProject(projectId: string): Promise<ServiceResult<TeamEntity[]>> {
        return this.findBy('projectId', projectId);
    }

    /**
     * Busca equipes por canteiro
     */
    async getBySite(siteId: string): Promise<ServiceResult<TeamEntity[]>> {
        return this.findBy('siteId', siteId);
    }

    /**
     * Busca equipes ativas
     */
    async getActive(): Promise<ServiceResult<TeamEntity[]>> {
        return this.findBy('active', true);
    }

    /**
     * Adiciona membro à equipe
     */
    async addMember(teamId: string, userId: string, role?: string): Promise<ServiceResult<TeamMember>> {
        try {
            const validation = this.validate(TeamMemberSchema, { teamId, userId, role });
            if (!validation.success) {
                return validation as ServiceResult<TeamMember>;
            }

            const snakeCaseData = this.toSnakeCase({ teamId, userId, role });

            const { data, error } = await orionApi
                .from<TeamMember>('team_members')
                .insert(snakeCaseData)
                .select('*')
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return {
                success: true,
                data: this.toCamelCase(data as Record<string, unknown>) as unknown as TeamMember
            };
        } catch (error) {
            console.error('[TeamService] addMember error:', error);
            return { success: false, error: (error as Error).message || 'Erro ao adicionar membro' };
        }
    }

    /**
     * Remove membro da equipe
     */
    async removeMember(teamId: string, userId: string): Promise<ServiceResult<void>> {
        try {
            const { error } = await orionApi
                .from('team_members')
                .delete()
                .eq('team_id', teamId)
                .eq('user_id', userId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('[TeamService] removeMember error:', error);
            return { success: false, error: (error as Error).message || 'Erro ao remover membro' };
        }
    }

    /**
     * Busca membros de uma equipe
     */
    async getMembers(teamId: string): Promise<ServiceResult<TeamMember[]>> {
        try {
            const { data, error } = await orionApi
                .from<TeamMember>('team_members')
                .select('*')
                .eq('team_id', teamId);

            if (error) {
                return { success: false, error: error.message };
            }

            const mapped = (data || []).map(item =>
                this.toCamelCase(item as Record<string, unknown>) as unknown as TeamMember
            );

            return { success: true, data: mapped };
        } catch (error) {
            console.error('[TeamService] getMembers error:', error);
            return { success: false, error: (error as Error).message || 'Erro ao buscar membros' };
        }
    }
}

// Singleton instance
export const teamService = new TeamService();
