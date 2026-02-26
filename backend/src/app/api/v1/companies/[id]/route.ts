import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { CompanyService } from "@/modules/companies/application/company.service";
import { PrismaCompanyRepository } from "@/modules/companies/infrastructure/prisma-company.repository";
import { VALIDATION } from "@/lib/constants";
import { isGodRole } from "@/lib/constants/security";

// Injeção de Dependência (Manual devido ao Next.js Route handlers)
const companyRepository = new PrismaCompanyRepository();
const companyService = new CompanyService(companyRepository);

const updateCompanySchema = z.object({
  name: z.string().min(2).max(VALIDATION.STRING.MAX_NAME).optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  metadata: z.any().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar empresa
export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    await authSession.requireAuth(request);
    const { id } = await params;
    const company = await companyService.getCompanyById(id);
    return ApiResponse.json(company);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "Company not found") {
      return ApiResponse.notFound("Empresa não encontrada");
    }
    logger.error("Erro ao buscar empresa", { error: err.message });
    return handleApiError(error, "src/app/api/v1/companies/[id]/route.ts#GET");
  }
}

// PUT - Atualizar empresa
export async function PUT(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const user = await authSession.requireAuth(request);
    const { id } = await params;

    const body = await request.json();
    const data = updateCompanySchema.parse(body);

    // Validação de Escopo: Apenas Admin ou o próprio dono da empresa
    const isAdmin = authSession.isUserAdmin(
      user.role,
      user.hierarchyLevel,
      user.permissions as Record<string, boolean>,
    );
    if (!isAdmin && user.companyId !== id) {
      return ApiResponse.forbidden(
        "Você não tem permissão para alterar dados desta empresa",
      );
    }

    // Se houver alteração de metadata.system, exige God Role
    const metadata = data.metadata as Record<string, unknown> | undefined;
    if (metadata?.system && !isGodRole(user.role)) {
      return ApiResponse.forbidden(
        "Apenas administradores do sistema podem alterar configurações globais",
      );
    }

    const company = await companyService.updateCompany(id, data);

    logger.info("Empresa atualizada", { companyId: company.id });

    return ApiResponse.json(company, "Empresa atualizada com sucesso");
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "Company not found") {
      return ApiResponse.notFound("Empresa não encontrada");
    }
    logger.error("Erro ao atualizar empresa", { error: err.message });
    return handleApiError(error, "src/app/api/v1/companies/[id]/route.ts#PUT");
  }
}

// DELETE - Remover empresa
export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    await authSession.requireAdmin(request);
    const { id } = await params;

    await companyService.deleteCompany(id);

    logger.info("Empresa removida", { companyId: id });

    return ApiResponse.noContent();
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "Company not found") {
      return ApiResponse.notFound("Empresa não encontrada");
    }
    logger.error("Erro ao remover empresa", { error: err.message });
    return handleApiError(
      error,
      "src/app/api/v1/companies/[id]/route.ts#DELETE",
    );
  }
}
