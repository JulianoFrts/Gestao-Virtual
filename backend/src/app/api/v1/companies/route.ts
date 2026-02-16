/**
 * Companies API - GESTÃO VIRTUAL Backend
 *
 * Endpoint: /api/v1/companies
 *
 * GET  - Lista empresas
 * POST - Cria nova empresa
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/core/common/domain/common.schema";
import { emptyToUndefined } from "@/lib/utils/validators/schemas";
import { CompanyService } from "@/modules/companies/application/company.service";
import { PrismaCompanyRepository } from "@/modules/companies/infrastructure/prisma-company.repository";
import { VALIDATION, API } from "@/lib/constants";

// Injeção de Dependência (Manual devido ao Next.js Route handlers)
const companyRepository = new PrismaCompanyRepository();
const companyService = new CompanyService(companyRepository);

// =============================================
// SCHEMAS DE VALIDAÇÃO
// =============================================

const createCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(VALIDATION.STRING.MAX_NAME),
  taxId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  logoUrl: z.string().optional(),
});

const querySchema = paginationQuerySchema.extend({
  search: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  isActive: z.preprocess(
    emptyToUndefined,
    z.enum(["true", "false"]).optional().nullable(),
  ),
});

// =============================================
// GET - Listar Empresas
// =============================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const validation = Validator.validateQuery(
      querySchema,
      request.nextUrl.searchParams,
    );
    if (!validation.success) return validation.response;

    const { page = API.PAGINATION.DEFAULT_PAGE, limit = API.PAGINATION.DEFAULT_LIMIT, search, isActive } = validation.data as any;

    const result = await companyService.listCompanies({
      page,
      limit,
      search,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
    });

    return ApiResponse.json(result);
  } catch (error) {
    logger.error("Erro ao listar empresas", { error });
    return handleApiError(error, "src/app/api/v1/companies/route.ts#GET");
  }
}

// =============================================
// POST - Criar Empresa
// =============================================

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = Validator.validate(createCompanySchema, body);
    if (!validation.success) return validation.response;

    const company = await companyService.createCompany(validation.data);

    logger.info("Empresa criada", { companyId: company.id });
    return ApiResponse.created(company, "Empresa criada com sucesso");
  } catch (error: any) {
    if (error.message === "CNPJ/CPF já cadastrado") {
      return ApiResponse.conflict(error.message);
    }
    logger.error("Erro ao criar empresa", { error });
    return handleApiError(error, "src/app/api/v1/companies/route.ts#POST");
  }
}
