/**
 * Base API Service
 * 
 * Classe base para todos os services de API.
 * Fornece métodos CRUD genéricos com validação Zod.
 */

import { z, ZodSchema } from 'zod';
import { orionApi } from '@/integrations/orion/client';

export interface ApiResponse<T> {
    data: T | null;
    error: { message: string; code?: string } | null;
    count?: number;
}

export interface ServiceResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    validationErrors?: Record<string, string>;
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
}

export interface FilterOptions {
    [key: string]: unknown;
}

/**
 * BaseApiService
 * 
 * Classe abstrata que fornece operações CRUD genéricas.
 * Todos os services específicos devem estender esta classe.
 */
export abstract class BaseApiService<
    TEntity,
    TCreate,
    TUpdate = Partial<TCreate>
> {
    protected abstract tableName: string;
    protected abstract createSchema: ZodSchema<TCreate>;
    protected abstract updateSchema: ZodSchema<TUpdate>;

    /**
     * Valida dados usando schema Zod
     */
    protected validate<T>(schema: ZodSchema<T>, data: unknown): ServiceResult<T> {
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
                return {
                    success: false,
                    error: 'Erro de validação',
                    validationErrors
                };
            }
            return { success: false, error: 'Erro desconhecido na validação' };
        }
    }

    /**
     * Mapeia campos do frontend para o formato do backend (snake_case)
     */
    protected toSnakeCase(data: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            // Converter camelCase para snake_case
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = value;
        }
        return result;
    }

    /**
     * Mapeia campos do backend (snake_case) para o frontend (camelCase)
     */
    protected toCamelCase(data: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            // Converter snake_case para camelCase
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = value;
        }
        return result;
    }

    /**
     * Lista todas as entidades
     */
    async getAll(options?: PaginationOptions & FilterOptions): Promise<ServiceResult<TEntity[]>> {
        try {
            let query = orionApi.from<TEntity>(this.tableName).select('*');

            // Aplicar ordenação
            if (options?.orderBy) {
                query = query.order(options.orderBy, { ascending: options.orderDirection !== 'desc' });
            }

            // Aplicar limite
            if (options?.limit) {
                query = query.limit(options.limit);
            }

            const { data, error } = await query;

            if (error) {
                return { success: false, error: error.message };
            }

            // Mapear campos para camelCase
            const mapped = (data || []).map(item =>
                this.toCamelCase(item as Record<string, any>) as TEntity
            );

            return { success: true, data: mapped };
        } catch (error) {
            console.error(`[${this.tableName}Service] getAll error:`, error);
            return { success: false, error: (error as Error).message || 'Erro ao buscar dados' };
        }
    }

    /**
     * Busca uma entidade por ID
     */
    async getById(id: string): Promise<ServiceResult<TEntity>> {
        try {
            const { data, error } = await orionApi
                .from<TEntity>(this.tableName)
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            if (!data) {
                return { success: false, error: 'Registro não encontrado' };
            }

            const mapped = this.toCamelCase(data as Record<string, unknown>) as unknown as TEntity;
            return { success: true, data: mapped };
        } catch (error) {
            console.error(`[${this.tableName}Service] getById error:`, error);
            return { success: false, error: (error as Error).message || 'Erro ao buscar registro' };
        }
    }

    /**
     * Cria uma nova entidade
     */
    async create(data: TCreate): Promise<ServiceResult<TEntity>> {
        // Validar dados
        const validation = this.validate(this.createSchema, data);
        if (!validation.success) {
            return validation as ServiceResult<TEntity>;
        }

        try {
            // Converter para snake_case antes de enviar
            const snakeCaseData = this.toSnakeCase(validation.data as Record<string, any>);

            const { data: created, error } = await orionApi
                .from<TEntity>(this.tableName)
                .insert(snakeCaseData)
                .select('*')
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            const mapped = this.toCamelCase(created as Record<string, unknown>) as unknown as TEntity;
            return { success: true, data: mapped };
        } catch (error) {
            console.error(`[${this.tableName}Service] create error:`, error);
            return { success: false, error: (error as Error).message || 'Erro ao criar registro' };
        }
    }

    /**
     * Atualiza uma entidade existente
     */
    async update(id: string, data: TUpdate): Promise<ServiceResult<TEntity>> {
        // Validar dados
        const validation = this.validate(this.updateSchema, data);
        if (!validation.success) {
            return validation as ServiceResult<TEntity>;
        }

        try {
            // Converter para snake_case antes de enviar
            const snakeCaseData = this.toSnakeCase(validation.data as Record<string, any>);

            const { data: updated, error } = await orionApi
                .from<TEntity>(this.tableName)
                .update(snakeCaseData)
                .eq('id', id)
                .select('*')
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            const mapped = this.toCamelCase(updated as Record<string, unknown>) as unknown as TEntity;
            return { success: true, data: mapped };
        } catch (error) {
            console.error(`[${this.tableName}Service] update error:`, error);
            return { success: false, error: error.message || 'Erro ao atualizar registro' };
        }
    }

    /**
     * Remove uma entidade
     */
    async delete(id: string): Promise<ServiceResult<void>> {
        try {
            const { error } = await orionApi
                .from(this.tableName)
                .delete()
                .eq('id', id);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error(`[${this.tableName}Service] delete error:`, error);
            return { success: false, error: error.message || 'Erro ao excluir registro' };
        }
    }

    /**
     * Busca por campo específico
     */
    async findBy(field: string, value: unknown): Promise<ServiceResult<TEntity[]>> {
        try {
            const snakeField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

            const { data, error } = await orionApi
                .from<TEntity>(this.tableName)
                .select('*')
                .eq(snakeField, value);

            if (error) {
                return { success: false, error: error.message };
            }

            const mapped = (data || []).map(item =>
                this.toCamelCase(item as Record<string, any>) as TEntity
            );

            return { success: true, data: mapped };
        } catch (error: any) {
            console.error(`[${this.tableName}Service] findBy error:`, error);
            return { success: false, error: error.message || 'Erro ao buscar registros' };
        }
    }

    /**
     * Busca o primeiro registro que corresponde ao critério
     */
    async findOneBy(field: string, value: unknown): Promise<ServiceResult<TEntity | null>> {
        try {
            const snakeField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

            const { data, error } = await orionApi
                .from<TEntity>(this.tableName)
                .select('*')
                .eq(snakeField, value)
                .maybeSingle();

            if (error) {
                return { success: false, error: error.message };
            }

            if (!data) {
                return { success: true, data: null };
            }

            const mapped = this.toCamelCase(data as Record<string, unknown>) as unknown as TEntity;
            return { success: true, data: mapped };
        } catch (error) {
            console.error(`[${this.tableName}Service] findOneBy error:`, error);
            return { success: false, error: error.message || 'Erro ao buscar registro' };
        }
    }
}
