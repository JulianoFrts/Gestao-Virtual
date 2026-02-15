/**
 * TimeRecord Service
 * 
 * Service para operações de registro de ponto com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
import { orionApi } from '@/integrations/orion/client';
import {
    TimeRecordSchema,
    CreateTimeRecordSchema,
    type TimeRecord,
    type CreateTimeRecord
} from '@/models/schemas';

export interface TimeRecordEntity extends TimeRecord {
    id: string;
    createdAt: Date;
    // Campos adicionais para exibição
    userName?: string;
    userPhoto?: string;
}

class TimeRecordService extends BaseApiService<TimeRecordEntity, CreateTimeRecord, Partial<CreateTimeRecord>> {
    protected tableName = 'time_records';
    protected createSchema = CreateTimeRecordSchema;
    protected updateSchema = CreateTimeRecordSchema.partial();

    /**
     * Busca registros por usuário
     */
    async getByUser(userId: string): Promise<ServiceResult<TimeRecordEntity[]>> {
        return this.findBy('userId', userId);
    }

    /**
     * Busca registros de hoje por usuário
     */
    async getTodayByUser(userId: string): Promise<ServiceResult<TimeRecordEntity[]>> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data, error } = await orionApi
                .from<TimeRecordEntity>(this.tableName)
                .select('*')
                .eq('user_id', userId);

            if (error) {
                return { success: false, error: error.message };
            }

            // Filtrar por data no frontend (backend pode não suportar gte/lte)
            const filtered = (data || []).filter(record => {
                const recordDate = new Date(record.timestamp);
                return recordDate >= today && recordDate < tomorrow;
            });

            const mapped = filtered.map(item =>
                this.toCamelCase(item as Record<string, any>) as TimeRecordEntity
            );

            return { success: true, data: mapped };
        } catch (error: any) {
            console.error('[TimeRecordService] getTodayByUser error:', error);
            return { success: false, error: error.message || 'Erro ao buscar registros' };
        }
    }

    /**
     * Registra entrada
     */
    async registerEntry(userId: string, location?: { latitude: number; longitude: number }, photoUrl?: string): Promise<ServiceResult<TimeRecordEntity>> {
        return this.create({
            userId,
            type: 'entry',
            timestamp: new Date(),
            latitude: location?.latitude,
            longitude: location?.longitude,
            photoUrl
        });
    }

    /**
     * Registra saída
     */
    async registerExit(userId: string, location?: { latitude: number; longitude: number }, photoUrl?: string): Promise<ServiceResult<TimeRecordEntity>> {
        return this.create({
            userId,
            type: 'exit',
            timestamp: new Date(),
            latitude: location?.latitude,
            longitude: location?.longitude,
            photoUrl
        });
    }

    /**
     * Busca último registro do usuário
     */
    async getLastRecord(userId: string): Promise<ServiceResult<TimeRecordEntity | null>> {
        try {
            const { data, error } = await orionApi
                .from<TimeRecordEntity>(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .limit(1);

            if (error) {
                return { success: false, error: error.message };
            }

            if (!data || data.length === 0) {
                return { success: true, data: null };
            }

            const mapped = this.toCamelCase(data[0] as Record<string, any>) as TimeRecordEntity;
            return { success: true, data: mapped };
        } catch (error: any) {
            console.error('[TimeRecordService] getLastRecord error:', error);
            return { success: false, error: error.message || 'Erro ao buscar último registro' };
        }
    }

    /**
     * Verifica se usuário já registrou entrada hoje
     */
    async hasEntryToday(userId: string): Promise<ServiceResult<boolean>> {
        const result = await this.getTodayByUser(userId);
        if (!result.success) {
            return { success: false, error: result.error };
        }

        const hasEntry = (result.data || []).some(record =>
            record.type.toLowerCase() === 'entry'
        );

        return { success: true, data: hasEntry };
    }

    /**
     * Verifica se usuário já registrou saída hoje
     */
    async hasExitToday(userId: string): Promise<ServiceResult<boolean>> {
        const result = await this.getTodayByUser(userId);
        if (!result.success) {
            return { success: false, error: result.error };
        }

        const hasExit = (result.data || []).some(record =>
            record.type.toLowerCase() === 'exit'
        );

        return { success: true, data: hasExit };
    }
}

// Singleton instance
export const timeRecordService = new TimeRecordService();
