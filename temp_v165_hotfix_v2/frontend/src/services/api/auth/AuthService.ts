/**
 * Auth Service
 * 
 * Service centralizado para operações de autenticação.
 */

import { orionApi } from '@/integrations/orion/client';
import { ServiceResult } from '../BaseApiService';
import { UserLoginSchema, type UserLogin } from '@/models/schemas';
import { z } from 'zod';

export interface AuthSession {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    user: AuthUser;
}

export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    image: string | null;
}

class AuthService {
    /**
     * Valida dados com Zod
     */
    private validate<T>(schema: z.ZodSchema<T>, data: unknown): ServiceResult<T> {
        try {
            const validated = schema.parse(data);
            return { success: true, data: validated };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const validationErrors: Record<string, string> = {};
                error.errors.forEach(err => {
                    const path = err.path.join('.');
                    validationErrors[path] = err.message;
                });
                return { success: false, error: 'Erro de validação', validationErrors };
            }
            return { success: false, error: 'Erro desconhecido na validação' };
        }
    }

    /**
     * Login com email e senha
     */
    async login(credentials: UserLogin): Promise<ServiceResult<AuthSession>> {
        const validation = this.validate(UserLoginSchema, credentials);
        if (!validation.success) {
            return validation as ServiceResult<AuthSession>;
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

            const session: AuthSession = {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresIn: data.session.expires_in || 3600,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name || data.user.user_metadata?.name || null,
                    role: data.user.role || data.user.user_metadata?.role || 'USER',
                    image: data.user.image || data.user.user_metadata?.avatar_url || null
                }
            };

            return { success: true, data: session };
        } catch (error: any) {
            console.error('[AuthService] login error:', error);
            return { success: false, error: error.message || 'Erro no login' };
        }
    }

    /**
     * Logout
     */
    async logout(): Promise<ServiceResult<void>> {
        try {
            await orionApi.auth.signOut();
            return { success: true };
        } catch (error: any) {
            console.error('[AuthService] logout error:', error);
            return { success: false, error: error.message || 'Erro no logout' };
        }
    }

    /**
     * Obtém sessão atual
     */
    async getSession(): Promise<ServiceResult<AuthSession | null>> {
        try {
            const { data, error } = await orionApi.auth.getSession();

            if (error) {
                return { success: false, error: error.message };
            }

            if (!data.session) {
                return { success: true, data: null };
            }

            const { data: userData } = await orionApi.auth.getUser();

            const session: AuthSession = {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresIn: data.session.expires_in || 3600,
                user: {
                    id: userData.user?.id || '',
                    email: userData.user?.email || '',
                    name: userData.user?.name || userData.user?.user_metadata?.name || null,
                    role: userData.user?.role || userData.user?.user_metadata?.role || 'USER',
                    image: userData.user?.image || userData.user?.user_metadata?.avatar_url || null
                }
            };

            return { success: true, data: session };
        } catch (error: any) {
            console.error('[AuthService] getSession error:', error);
            return { success: false, error: error.message || 'Erro ao buscar sessão' };
        }
    }

    /**
     * Obtém usuário atual
     */
    async getCurrentUser(): Promise<ServiceResult<AuthUser | null>> {
        try {
            const { data, error } = await orionApi.auth.getUser();

            if (error) {
                return { success: false, error: error.message };
            }

            if (!data.user) {
                return { success: true, data: null };
            }

            const user: AuthUser = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name || data.user.user_metadata?.name || null,
                role: data.user.role || data.user.user_metadata?.role || 'USER',
                image: data.user.image || data.user.user_metadata?.avatar_url || null
            };

            return { success: true, data: user };
        } catch (error: any) {
            console.error('[AuthService] getCurrentUser error:', error);
            return { success: false, error: error.message || 'Erro ao buscar usuário' };
        }
    }

    /**
     * Verifica se está autenticado
     */
    async isAuthenticated(): Promise<boolean> {
        const result = await this.getSession();
        return result.success && result.data !== null;
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
            console.error('[AuthService] requestPasswordReset error:', error);
            return { success: false, error: error.message || 'Erro ao solicitar reset' };
        }
    }

    /**
     * Atualiza senha
     */
    async updatePassword(newPassword: string): Promise<ServiceResult<void>> {
        if (newPassword.length < 6) {
            return { success: false, error: 'Senha deve ter pelo menos 6 caracteres' };
        }

        try {
            const { error } = await orionApi.auth.updateUser({ password: newPassword });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            console.error('[AuthService] updatePassword error:', error);
            return { success: false, error: error.message || 'Erro ao atualizar senha' };
        }
    }

    /**
     * Registra listener de mudança de estado
     */
    onAuthStateChange(callback: (event: string, session: AuthSession | null) => void): { unsubscribe: () => void } {
        const { data } = orionApi.auth.onAuthStateChange((event, session) => {
            if (session) {
                const authSession: AuthSession = {
                    accessToken: session.access_token,
                    refreshToken: session.refresh_token,
                    expiresIn: session.expires_in || 3600,
                    user: {
                        id: session.user?.id || '',
                        email: session.user?.email || '',
                        name: session.user?.name || session.user?.user_metadata?.name || null,
                        role: session.user?.role || session.user?.user_metadata?.role || 'USER',
                        image: session.user?.image || session.user?.user_metadata?.avatar_url || null
                    }
                };
                callback(event, authSession);
            } else {
                callback(event, null);
            }
        });

        return {
            unsubscribe: () => data.subscription.unsubscribe()
        };
    }
}

// Singleton instance
export const authService = new AuthService();
