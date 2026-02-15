/**
 * AuditLog Service
 * 
 * Service para operações de log de auditoria com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
import { orionApi } from '@/integrations/orion/client';
import {
    AuditLogSchema,
    type AuditLog
} from '@/models/schemas';

export interface AuditLogEntity extends AuditLog {
    id: string;
    createdAt: Date;
}

// Schema para criar log (sem id e createdAt)
const CreateAuditLogSchema = AuditLogSchema.omit({ id: true, createdAt: true });
type CreateAuditLog = Omit<AuditLog, 'id' | 'createdAt'>;

class AuditLogService extends BaseApiService<AuditLogEntity, CreateAuditLog, Partial<CreateAuditLog>> {
    protected tableName = 'audit_logs';
    protected createSchema = CreateAuditLogSchema;
    protected updateSchema = CreateAuditLogSchema.partial();

    /**
     * Busca logs por usuário
     */
    async getByUser(userId: string): Promise<ServiceResult<AuditLogEntity[]>> {
        return this.findBy('userId', userId);
    }

    /**
     * Busca logs por entidade
     */
    async getByEntity(entity: string, entityId?: string): Promise<ServiceResult<AuditLogEntity[]>> {
        try {
            let query = orionApi
                .from<AuditLogEntity>(this.tableName)
                .select('*')
                .eq('entity', entity);

            if (entityId) {
                query = query.eq('entity_id', entityId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                return { success: false, error: error.message };
            }

            const mapped = (data || []).map(item =>
                this.toCamelCase(item as Record<string, any>) as AuditLogEntity
            );

            return { success: true, data: mapped };
        } catch (error: any) {
            console.error('[AuditLogService] getByEntity error:', error);
            return { success: false, error: error.message || 'Erro ao buscar logs' };
        }
    }

    /**
     * Busca logs por ação
     */
    async getByAction(action: string): Promise<ServiceResult<AuditLogEntity[]>> {
        return this.findBy('action', action);
    }

    /**
     * Registra ação de auditoria
     */
    async log(
        userId: string,
        action: string,
        entity: string,
        entityId: string,
        details?: any
    ): Promise<ServiceResult<AuditLogEntity>> {
        return this.create({
            userId,
            action,
            entity,
            entityId,
            details,
            ipAddress: null, // Será preenchido pelo backend se necessário
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
        });
    }

    /**
     * Registra ação de criação
     */
    async logCreate(userId: string, entity: string, entityId: string, details?: any): Promise<ServiceResult<AuditLogEntity>> {
        return this.log(userId, 'CREATE', entity, entityId, details);
    }

    /**
     * Registra ação de atualização
     */
    async logUpdate(userId: string, entity: string, entityId: string, details?: any): Promise<ServiceResult<AuditLogEntity>> {
        return this.log(userId, 'UPDATE', entity, entityId, details);
    }

    /**
     * Registra ação de exclusão
     */
    async logDelete(userId: string, entity: string, entityId: string, details?: any): Promise<ServiceResult<AuditLogEntity>> {
        return this.log(userId, 'DELETE', entity, entityId, details);
    }

    /**
     * Registra ação de login
     */
    async logLogin(userId: string, details?: any): Promise<ServiceResult<AuditLogEntity>> {
        return this.log(userId, 'LOGIN', 'User', userId, details);
    }

    /**
     * Registra ação de logout
     */
    async logLogout(userId: string, details?: any): Promise<ServiceResult<AuditLogEntity>> {
        return this.log(userId, 'LOGOUT', 'User', userId, details);
    }
}

// Singleton instance
export const auditLogService = new AuditLogService();
