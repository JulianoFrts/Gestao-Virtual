/**
 * Project Service
 * 
 * Service para operações de projeto com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
import {
    ProjectSchema,
    CreateProjectSchema,
    UpdateProjectSchema,
    type Project,
    type CreateProject,
    type UpdateProject
} from '@/models/schemas';

export interface ProjectEntity extends Project {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

class ProjectService extends BaseApiService<ProjectEntity, CreateProject, UpdateProject> {
    protected tableName = 'projects';
    protected createSchema = CreateProjectSchema;
    protected updateSchema = UpdateProjectSchema;

    /**
     * Busca projetos por empresa
     */
    async getByCompany(companyId: string): Promise<ServiceResult<ProjectEntity[]>> {
        return this.findBy('companyId', companyId);
    }

    /**
     * Busca projetos ativos
     */
    async getActive(): Promise<ServiceResult<ProjectEntity[]>> {
        return this.findBy('status', 'IN_PROGRESS');
    }

    /**
     * Busca projetos por status
     */
    async getByStatus(status: string): Promise<ServiceResult<ProjectEntity[]>> {
        return this.findBy('status', status);
    }
}

// Singleton instance
export const projectService = new ProjectService();
