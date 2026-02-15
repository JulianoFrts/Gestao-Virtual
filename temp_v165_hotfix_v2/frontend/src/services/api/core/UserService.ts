/**
 * User Service
 * 
 * Service para operações de usuário com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
import { orionApi } from '@/integrations/orion/client';
import {
    UserBaseSchema,
    CreateUserSchema,
    UpdateUserSchema,
    UserLoginSchema,
    type UserBase,
    type CreateUser,
    type UpdateUser,
    type UserLogin
} from '@/models/schemas';

export interface UserEntity extends UserBase {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

class UserService extends BaseApiService<UserEntity, CreateUser, UpdateUser> {
    protected tableName = 'users';
    protected createSchema = CreateUserSchema;
    protected updateSchema = UpdateUserSchema;

    /**
     * Login de usuário
     */
    async login(credentials: UserLogin): Promise<ServiceResult<{ user: UserEntity; token: string }>> {
        const validation = this.validate(UserLoginSchema, credentials);
        if (!validation.success) {
            return validation as ServiceResult<{ user: UserEntity; token: string }>;
        }

        try {
            const { data, error } = await orionApi.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
            });

            if (error || !data.user || !data.session) {
                return {
                    success: false,
                    error: error?.message || 'Credenciais inválidas'
                };
            }

            return {
                success: true,
                data: {
                    user: this.toCamelCase(data.user) as UserEntity,
                    token: data.session.access_token
                }
            };
        } catch (error: any) {
            console.error('[UserService] login error:', error);
            return { success: false, error: error.message || 'Erro no login' };
        }
    }

    /**
     * Registro de novo usuário
     */
    async register(data: CreateUser): Promise<ServiceResult<UserEntity>> {
        const validation = this.validate(CreateUserSchema, data);
        if (!validation.success) {
            return validation as ServiceResult<UserEntity>;
        }

        try {
            const { data: result, error } = await orionApi.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        name: data.name,
                        phone: data.phone,
                        cpf: data.cpf
                    }
                }
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (!result.user) {
                return { success: false, error: 'Erro ao criar usuário' };
            }

            return {
                success: true,
                data: this.toCamelCase(result.user) as UserEntity
            };
        } catch (error: any) {
            console.error('[UserService] register error:', error);
            return { success: false, error: error.message || 'Erro no registro' };
        }
    }

    /**
     * Logout do usuário atual
     */
    async logout(): Promise<ServiceResult<void>> {
        try {
            await orionApi.auth.signOut();
            return { success: true };
        } catch (error: any) {
            console.error('[UserService] logout error:', error);
            return { success: false, error: error.message || 'Erro no logout' };
        }
    }

    /**
     * Obtém o usuário atual logado
     */
    async getCurrentUser(): Promise<ServiceResult<UserEntity | null>> {
        try {
            const { data, error } = await orionApi.auth.getUser();

            if (error) {
                return { success: false, error: error.message };
            }

            if (!data.user) {
                return { success: true, data: null };
            }

            return {
                success: true,
                data: this.toCamelCase(data.user) as UserEntity
            };
        } catch (error: any) {
            console.error('[UserService] getCurrentUser error:', error);
            return { success: false, error: error.message || 'Erro ao buscar usuário' };
        }
    }

    /**
     * Atualiza a senha do usuário
     */
    async updatePassword(userId: string, newPassword: string): Promise<ServiceResult<void>> {
        if (newPassword.length < 6) {
            return {
                success: false,
                error: 'Senha deve ter pelo menos 6 caracteres'
            };
        }

        try {
            const { error } = await orionApi.auth.updateUser({ password: newPassword });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            console.error('[UserService] updatePassword error:', error);
            return { success: false, error: error.message || 'Erro ao atualizar senha' };
        }
    }

    /**
     * Solicita reset de senha
     */
    async requestPasswordReset(email: string): Promise<ServiceResult<void>> {
        try {
            const { error } = await orionApi.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            console.error('[UserService] requestPasswordReset error:', error);
            return { success: false, error: error.message || 'Erro ao solicitar reset de senha' };
        }
    }

    /**
     * Busca usuários por empresa
     */
    async getByCompany(companyId: string): Promise<ServiceResult<UserEntity[]>> {
        return this.findBy('companyId', companyId);
    }

    /**
     * Busca usuários por projeto
     */
    async getByProject(projectId: string): Promise<ServiceResult<UserEntity[]>> {
        return this.findBy('projectId', projectId);
    }

    /**
     * Busca usuários por canteiro
     */
    async getBySite(siteId: string): Promise<ServiceResult<UserEntity[]>> {
        return this.findBy('siteId', siteId);
    }

    /**
     * Busca usuário por email
     */
    async getByEmail(email: string): Promise<ServiceResult<UserEntity | null>> {
        return this.findOneBy('email', email);
    }

    /**
     * Busca usuário por CPF
     */
    async getByCpf(cpf: string): Promise<ServiceResult<UserEntity | null>> {
        return this.findOneBy('cpf', cpf);
    }

    /**
     * Bloqueia/desbloqueia usuário
     */
    async toggleBlock(userId: string, isBlocked: boolean): Promise<ServiceResult<UserEntity>> {
        return this.update(userId, { status: isBlocked ? 'BLOCKED' : 'ACTIVE' } as UpdateUser);
    }
}

// Singleton instance
export const userService = new UserService();
