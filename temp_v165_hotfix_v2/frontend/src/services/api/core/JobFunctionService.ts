/**
 * JobFunction Service
 *
 * Service para operações de funções/cargos com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
import {
    JobFunctionSchema,
    CreateJobFunctionSchema,
    UpdateJobFunctionSchema,
    type JobFunction,
    type CreateJobFunction,
    type UpdateJobFunction
} from '@/models/schemas';

export interface JobFunctionEntity extends JobFunction {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

class JobFunctionService extends BaseApiService<JobFunctionEntity, CreateJobFunction, UpdateJobFunction> {
    protected tableName = 'job_functions';
    protected createSchema = CreateJobFunctionSchema;
    protected updateSchema = UpdateJobFunctionSchema;

    /**
     * Busca funções que podem liderar equipe
     */
    async getLeaderRoles(): Promise<ServiceResult<JobFunctionEntity[]>> {
        return this.findBy('canLeadTeam', true);
    }

    /**
     * Busca por nome
     */
    async getByName(name: string) {
        return this.findOneBy('name', name);
    }
}

// Singleton instance
export const jobFunctionService = new JobFunctionService();
