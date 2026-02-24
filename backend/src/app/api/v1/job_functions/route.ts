import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { JobFunctionService } from "@/modules/companies/application/job-function.service";
import { PrismaJobFunctionRepository } from "@/modules/companies/infrastructure/prisma-job-function.repository";
import { VALIDATION, API } from "@/lib/constants";
import { isSystemOwner } from "@/lib/constants/security";

// DI
const jobFunctionService = new JobFunctionService(
  new PrismaJobFunctionRepository(),
);

const createJobFunctionSchema = z.object({
  companyId: z.string().optional().nullable(),
  name: z.string().min(2).max(VALIDATION.STRING.MAX_NAME),
  description: z.string().optional(),
  canLeadTeam: z.boolean().default(false),
  hierarchyLevel: z.number().int().min(0).default(0),
  laborType: z.string().optional().default("MOD"),
});

const updateJobFunctionSchema = createJobFunctionSchema.partial();

const querySchema = z.object({
  page: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce
      .number()
      .min(1)
      .max(API.PAGINATION.MAX_LIMIT)
      .default(API.PAGINATION.DEFAULT_LIMIT),
  ),
  companyId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  search: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      companyId: searchParams.get("companyId"),
      search: searchParams.get("search"),
    });

    const { isUserAdmin: checkAdmin } = await import("@/lib/auth/session");
    const isAdmin = checkAdmin(
      user.role as unknown as string,
      (user as any).hierarchyLevel,
      (user as any).permissions,
    );

    const result = await jobFunctionService.listJobFunctions({
      ...query,
      isAdmin,
      currentUserCompanyId: user.companyId as string,
    });

    return ApiResponse.json(result);
  } catch (error) {
    logger.error("Erro ao listar cargos", { error });
    return handleApiError(error, "src/app/api/v1/job_functions/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { can } = await import("@/lib/auth/permissions");
    if (!(await can("functions.manage"))) {
      return ApiResponse.forbidden("Sem permissão para gerenciar cargos");
    }
    const user = await requireAuth();

    const body = await request.json();
    const data = createJobFunctionSchema.parse(body);

    // Regra de Negócio: Se não tiver companyId, precisa ser gestor global (System Owner)
    if (!data.companyId) {
      const isGlobalManager = isSystemOwner(user.role as string);
      if (!isGlobalManager) {
        return ApiResponse.forbidden(
          "Apenas gestores globais podem criar cargos sem empresa (Templates)",
        );
      }
    }
    // ... (omitting for brevity, but I will include full logic in the tool call)

    try {
      const jobFunction = await jobFunctionService.createJobFunction(data);
      logger.info("Cargo criado", { jobFunctionId: jobFunction.id });
      return ApiResponse.created(jobFunction, "Cargo criado com sucesso");
    } catch (error: any) {
      if (error.message === "COMPANY_NOT_FOUND") {
        return ApiResponse.badRequest("Empresa não encontrada");
      }
      if (error.message === "DUPLICATE_NAME") {
        return ApiResponse.conflict(
          "Cargo com este nome já existe nesta empresa ou globalmente",
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error("Erro ao criar cargo", { error });
    return handleApiError(error, "src/app/api/v1/job_functions/route.ts#POST");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { can } = await import("@/lib/auth/permissions");
    if (!(await can("functions.manage"))) {
      return ApiResponse.forbidden("Sem permissão para gerenciar cargos");
    }
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.badRequest("ID do cargo é obrigatório");
    }

    const body = await request.json();
    const data = updateJobFunctionSchema.parse(body);

    // Business Logic: If updating a global template (companyId is null/missing)
    // Check if user is system owner
    const existing = await jobFunctionService.getJobFunctionById(id);
    if (!existing) {
      return ApiResponse.notFound("Cargo não encontrado");
    }

    if (!existing.companyId) {
      const isGlobalManager = isSystemOwner(user.role as string);
      if (!isGlobalManager) {
        return ApiResponse.forbidden(
          "Apenas gestores globais podem editar cargos modelos",
        );
      }
    }

    try {
      const updated = await jobFunctionService.updateJobFunction(id, data);
      logger.info("Cargo atualizado (PATCH)", {
        jobFunctionId: id,
        updatedBy: user.id,
      });
      return ApiResponse.json(updated, "Cargo atualizado com sucesso");
    } catch (error: any) {
      if (error.message === "DUPLICATE_NAME") {
        return ApiResponse.conflict("Já existe um cargo com este nome");
      }
      throw error;
    }
  } catch (error) {
    logger.error("Erro ao atualizar cargo (PATCH)", { error });
    return handleApiError(error, "src/app/api/v1/job_functions/route.ts#PATCH");
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const { can } = await import("@/lib/auth/permissions");
    if (!(await can("functions.manage"))) {
      return ApiResponse.forbidden("Sem permissão para gerenciar cargos");
    }
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.badRequest("ID do cargo é obrigatório");
    }

    try {
      await jobFunctionService.deleteJobFunction(id);
      logger.info("Cargo excluído", { jobFunctionId: id, deletedBy: user.id });
      return ApiResponse.json(null, "Cargo excluído com sucesso");
    } catch (error: any) {
      if (error.message === "JOB_FUNCTION_NOT_FOUND") {
        return ApiResponse.notFound("Cargo não encontrado");
      }
      throw error;
    }
  } catch (error) {
    logger.error("Erro ao excluir cargo", { error });
    return handleApiError(
      error,
      "src/app/api/v1/job_functions/route.ts#DELETE",
    );
  }
}
