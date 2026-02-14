/**
 * Company Service
 * 
 * Service para operações de empresa com validação Zod e integração com ORION API.
 */

import { BaseApiService } from '../BaseApiService';
import {
    CompanySchema,
    CreateCompanySchema,
    UpdateCompanySchema,
    type Company,
    type CreateCompany,
    type UpdateCompany
} from '@/models/schemas';

export interface CompanyEntity extends Company {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

class CompanyService extends BaseApiService<CompanyEntity, CreateCompany, UpdateCompany> {
    protected tableName = 'companies';
    protected createSchema = CreateCompanySchema;
    protected updateSchema = UpdateCompanySchema;

    /**
     * Busca empresa por CNPJ
     */
    async getByCnpj(cnpj: string) {
        return this.findOneBy('cnpj', cnpj);
    }

    /**
     * Busca empresa por Tax ID
     */
    async getByTaxId(taxId: string) {
        return this.findOneBy('taxId', taxId);
    }
}

// Singleton instance
export const companyService = new CompanyService();
