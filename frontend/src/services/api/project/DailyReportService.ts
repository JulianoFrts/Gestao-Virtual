/**
 * DailyReport Service
 * 
 * Service para operações de relatório diário com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
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
}

// Singleton instance
export const dailyReportService = new DailyReportService();
