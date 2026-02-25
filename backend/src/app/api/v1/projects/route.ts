/**
 * Projects API - GESTÃO VIRTUAL Backend
 *
 * Endpoint: /api/v1/projects
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/modules/common/domain/common.schema";
import { ProjectService } from "@/modules/projects/application/project.service";
import { PrismaProjectRepository } from "@/modules/projects/infrastructure/prisma-project.repository";
import { PrismaCompanyRepository } from "@/modules/companies/infrastructure/prisma-company.repository";
import { VALIDATION } from "@/lib/constants";

// DI
const projectRepository = new PrismaProjectRepository();
const companyRepository = new PrismaCompanyRepository(); // We need this to check company existence
const projectService = new ProjectService(projectRepository);

const createProjectSchema = z.object({
  companyId: z.string().uuid("ID da empresa deve ser um UUID válido"),
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(VALIDATION.STRING.MAX_NAME),
  code: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  description: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  address: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  status: z
    .enum(["active", "paused", "completed", "cancelled"])
    .default("active"),
  startDate: z.preprocess(
    (val) => (val === "" || val === "0" || val === null ? undefined : val),
    z.string().datetime().optional().nullable(),
  ),
  endDate: z.preprocess(
    (val) => (val === "" || val === "0" || val === null ? undefined : val),
    z.string().datetime().optional().nullable(),
  ),
  plannedHours: z.preprocess(
    (val) => (val === "" || val === null ? 0 : val),
    z.coerce.number().optional().default(0),
  ),
  estimatedCost: z.preprocess(
    (val) => (val === "" || val === null ? 0 : val),
    z.coerce.number().optional().default(0),
  ),
});

const querySchema = paginationQuerySchema.extend({
  companyId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  status: z
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

// ===== HEAD (Health Check) =====
export async function HEAD() {
  return ApiResponse.noContent();
}

export async function GET(request: NextRequest) {
  try {
    const user = await authSession.requireAuth();

    const validation = Validator.validateQuery(
      querySchema,
      request.nextUrl.searchParams,
    );
    if (!validation.success) return validation.response;

    const {
      page = 1,
      limit = 10,
      companyId,
      status,
      search,
    } = validation.data as any;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      user.role,
      (user as any).hierarchyLevel,
      (user as any).permissions,
    );

    const where = buildProjectFilters(user, isGlobal, {
      companyId,
      status,
      search,
    });

    const result = await projectService.listProjects({
      where,
      page,
      limit,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { sites: true, userAffiliations: true } },
      },
    });

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/projects/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    await authSession.requirePermission("projects.manage", request);

    const body = await request.json();
    const validation = Validator.validate(createProjectSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data as any;

    // Validação de Escopo: Usuário só pode criar projeto para sua própria empresa (se não for admin sistêmico)
    await authSession.requireScope(data.companyId, "COMPANY", request);

    // Verificar se empresa existe
    const company = await companyRepository.findById(data.companyId);
    if (!company) {
      return ApiResponse.badRequest("Empresa não encontrada");
    }

    const project = await projectService.createProject({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });

    logger.info("Projeto criado", { projectId: project.id });

    return ApiResponse.created(project, "Projeto criado com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/projects/route.ts#POST");
  }
}

function buildProjectFilters(
  user: any,
  isGlobal: boolean,
  filters: { companyId?: string; status?: string; search?: string },
) {
  const where: Record<string, any> = {};

  // Enforcement de multitenancy: Apenas Admins Globais (rank 1000+) podem trocar de empresa
  if (!isGlobal) {
    where.companyId = user.companyId;
  } else if (filters.companyId) {
    // Admin Global pode filtrar por uma empresa específica
    where.companyId = filters.companyId;
  }

  if (filters.status) where.status = filters.status;
  // ... rest remains same but I'll update the whole block to be safe
  where.AND = [{ OR: [{ code: { not: "STD-001" } }, { code: null }] }];

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}
