/**
 * Company by ID API - GESTÃO VIRTUAL Backend
 *
 * Endpoint: /api/v1/companies/[id]
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { CompanyService } from "@/modules/companies/application/company.service";
import { PrismaCompanyRepository } from "@/modules/companies/infrastructure/prisma-company.repository";

// Injeção de Dependência (Manual devido ao Next.js Route handlers)
const companyRepository = new PrismaCompanyRepository();
const companyService = new CompanyService(companyRepository);

const updateCompanySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar empresa
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAuth();
    const company = await companyService.getCompanyById(id);
    return ApiResponse.json(company);
  } catch (error: any) {
    if (error.message === "Company not found") {
      return ApiResponse.notFound("Empresa não encontrada");
    }
    logger.error("Erro ao buscar empresa", { error });
    return handleApiError(error);
  }
}

// PUT - Atualizar empresa
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAdmin();

    const body = await request.json();
    const data = updateCompanySchema.parse(body);

    const company = await companyService.updateCompany(id, data);

    logger.info("Empresa atualizada", { companyId: company.id });

    return ApiResponse.json(company, "Empresa atualizada com sucesso");
  } catch (error: any) {
    if (error.message === "Company not found") {
      return ApiResponse.notFound("Empresa não encontrada");
    }
    logger.error("Erro ao atualizar empresa", { error });
    return handleApiError(error);
  }
}

// DELETE - Remover empresa
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAdmin();

    await companyService.deleteCompany(id);

    logger.info("Empresa removida", { companyId: id });

    return ApiResponse.noContent();
  } catch (error: any) {
    if (error.message === "Company not found") {
      return ApiResponse.notFound("Empresa não encontrada");
    }
    logger.error("Erro ao remover empresa", { error });
    return handleApiError(error);
  }
}
