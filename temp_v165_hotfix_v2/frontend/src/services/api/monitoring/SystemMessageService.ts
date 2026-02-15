/**
 * SystemMessage Service
 * 
 * Service para operações de mensagens do sistema com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
import { orionApi } from '@/integrations/orion/client';
import {
    SystemMessageSchema,
    CreateSystemMessageSchema,
    type SystemMessage,
    type CreateSystemMessage
} from '@/models/schemas';

export interface SystemMessageEntity extends SystemMessage {
    id: string;
    createdAt: Date;
}

class SystemMessageService extends BaseApiService<SystemMessageEntity, CreateSystemMessage, Partial<SystemMessage>> {
    protected tableName = 'system_messages';
    protected createSchema = CreateSystemMessageSchema;
    protected updateSchema = SystemMessageSchema.partial();

    /**
     * Busca mensagens por destinatário
     */
    async getByRecipient(recipientId: string): Promise<ServiceResult<SystemMessageEntity[]>> {
        return this.findBy('recipientId', recipientId);
    }

    /**
     * Busca mensagens não lidas por destinatário
     */
    async getUnreadByRecipient(recipientId: string): Promise<ServiceResult<SystemMessageEntity[]>> {
        try {
            const { data, error } = await orionApi
                .from<SystemMessageEntity>(this.tableName)
                .select('*')
                .eq('recipient_id', recipientId)
                .eq('read', false)
                .order('created_at', { ascending: false });

            if (error) {
                return { success: false, error: error.message };
            }

            const mapped = (data || []).map(item =>
                this.toCamelCase(item as Record<string, any>) as SystemMessageEntity
            );

            return { success: true, data: mapped };
        } catch (error: any) {
            console.error('[SystemMessageService] getUnreadByRecipient error:', error);
            return { success: false, error: error.message || 'Erro ao buscar mensagens' };
        }
    }

    /**
     * Marca mensagem como lida
     */
    async markAsRead(messageId: string): Promise<ServiceResult<SystemMessageEntity>> {
        return this.update(messageId, { read: true });
    }

    /**
     * Marca todas as mensagens do usuário como lidas
     */
    async markAllAsRead(recipientId: string): Promise<ServiceResult<void>> {
        try {
            const unreadResult = await this.getUnreadByRecipient(recipientId);
            if (!unreadResult.success) {
                return { success: false, error: unreadResult.error };
            }

            // Atualizar cada mensagem individualmente
            for (const message of unreadResult.data || []) {
                await this.markAsRead(message.id);
            }

            return { success: true };
        } catch (error: any) {
            console.error('[SystemMessageService] markAllAsRead error:', error);
            return { success: false, error: error.message || 'Erro ao marcar mensagens' };
        }
    }

    /**
     * Conta mensagens não lidas
     */
    async countUnread(recipientId: string): Promise<ServiceResult<number>> {
        const result = await this.getUnreadByRecipient(recipientId);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return { success: true, data: result.data?.length || 0 };
    }

    /**
     * Envia mensagem para usuário
     */
    async sendMessage(
        recipientId: string,
        title: string,
        content: string,
        type: 'info' | 'warning' | 'alert' | 'success' = 'info'
    ): Promise<ServiceResult<SystemMessageEntity>> {
        return this.create({
            recipientId,
            title,
            content,
            type
        });
    }

    /**
     * Envia alerta/notificação
     */
    async sendAlert(recipientId: string, title: string, content: string): Promise<ServiceResult<SystemMessageEntity>> {
        return this.sendMessage(recipientId, title, content, 'alert');
    }
}

// Singleton instance
export const systemMessageService = new SystemMessageService();
