/**
 * DailyReport Service
 * 
 * Service para operações de relatório diário com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '@/services/api/BaseApiService';
import { orionApi } from '@/integrations/orion/client';
import {
    DailyReportSchema,
    CreateDailyReportSchema,
    type DailyReport,
    type CreateDailyReport
} from '@/models/schemas';

export interface DailyReportEntity extends DailyReport {
    id: string;
    createdAt: Date;
}

class DailyReportService extends BaseApiService<DailyReportEntity, CreateDailyReport, Partial<CreateDailyReport>> {
    protected tableName = 'daily_reports';
    protected createSchema = CreateDailyReportSchema;
    protected updateSchema = CreateDailyReportSchema.partial();

    /**
     * Busca relatórios por equipe
     */
    async getByTeam(teamId: string): Promise<ServiceResult<DailyReportEntity[]>> {
        return this.findBy('teamId', teamId);
    }

    /**
     * Busca relatórios por projeto
     */
    async getByProject(projectId: string): Promise<ServiceResult<DailyReportEntity[]>> {
        return this.findBy('projectId', projectId);
    }

    /**
     * Busca relatórios por criador
     */
    async getByCreator(createdById: string): Promise<ServiceResult<DailyReportEntity[]>> {
        return this.findBy('createdById', createdById);
    }

    /**
     * Busca relatórios de hoje
     */
    async getToday(): Promise<ServiceResult<DailyReportEntity[]>> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.findBy('date', today.toISOString().split('T')[0]);
    }

    /**
     * Busca relatórios por data
     */
    async getByDate(date: Date): Promise<ServiceResult<DailyReportEntity[]>> {
        return this.findBy('date', date.toISOString().split('T')[0]);
    }

    /**
     * Aprova um relatório diário
     */
    async approve(id: string): Promise<ServiceResult<DailyReportEntity>> {
        try {
            const response = await orionApi.post<DailyReportEntity>(`/daily_reports/${id}/approve`);
            if (response.error) return { success: false, error: response.error.message };
            
            const mapped = this.toCamelCase(response.data as Record<string, unknown>) as unknown as DailyReportEntity;
            return { success: true, data: mapped };
        } catch (error: any) {
            return { success: false, error: error.message || 'Erro ao aprovar relatório' };
        }
    }

    /**
     * Rejeita um relatório diário
     */
    async reject(id: string, reason: string): Promise<ServiceResult<DailyReportEntity>> {
        try {
            const response = await orionApi.post<DailyReportEntity>(`/daily_reports/${id}/reject`, { reason });
            if (response.error) return { success: false, error: response.error.message };
            
            const mapped = this.toCamelCase(response.data as Record<string, unknown>) as unknown as DailyReportEntity;
            return { success: true, data: mapped };
        } catch (error: any) {
            return { success: false, error: error.message || 'Erro ao rejeitar relatório' };
        }
    }

    /**
     * Aprova múltiplos relatórios em lote
     */
    async bulkApprove(ids: string[]): Promise<ServiceResult<any>> {
        try {
            const response = await orionApi.post<any>(`/daily_reports/bulk/approve`, { ids });
            if (response.error) return { success: false, error: response.error.message };
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, error: error.message || 'Erro na aprovação em lote' };
        }
    }

    /**
     * Rejeita múltiplos relatórios em lote com o mesmo motivo
     */
    async bulkReject(ids: string[], reason: string): Promise<ServiceResult<any>> {
        try {
            const response = await orionApi.post<any>(`/daily_reports/bulk/reject`, { ids, reason });
            if (response.error) return { success: false, error: response.error.message };
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, error: error.message || 'Erro na rejeição em lote' };
        }
    }
}

// Singleton instance
export const dailyReportService = new DailyReportService();
