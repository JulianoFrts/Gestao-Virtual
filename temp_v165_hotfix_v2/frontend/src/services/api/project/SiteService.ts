/**
 * Site Service
 * 
 * Service para operações de canteiro com validação Zod e integração com ORION API.
 */

import { BaseApiService, ServiceResult } from '../BaseApiService';
import {
    SiteSchema,
    CreateSiteSchema,
    UpdateSiteSchema,
    type Site,
    type CreateSite,
    type UpdateSite
} from '@/models/schemas';

export interface SiteEntity extends Site {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

class SiteService extends BaseApiService<SiteEntity, CreateSite, UpdateSite> {
    protected tableName = 'sites';
    protected createSchema = CreateSiteSchema;
    protected updateSchema = UpdateSiteSchema;

    /**
     * Busca canteiros por projeto
     */
    async getByProject(projectId: string): Promise<ServiceResult<SiteEntity[]>> {
        return this.findBy('projectId', projectId);
    }
}

// Singleton instance
export const siteService = new SiteService();
