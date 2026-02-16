/**
 * Teams API - GESTÃO VIRTUAL Backend
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/core/common/domain/common.schema";
import { PrismaTeamRepository } from "@/modules/teams/infrastructure/prisma-team.repository";
import { TeamService } from "@/modules/teams/application/team.service";
import { VALIDATION, API } from "@/lib/constants";

// Inicialização do Service (Dependency Injection)
const repository = new PrismaTeamRepository();
const service = new TeamService(repository);

const createTeamSchema = z.object({
  companyId: z
    .string()
    .uuid("ID da empresa deve ser um UUID válido")
    .optional(),
  siteId: z.string().uuid("ID do canteiro deve ser um UUID válido").optional(),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(VALIDATION.STRING.MAX_NAME),
  supervisorId: z.string().optional(),
  displayOrder: z.number().default(0),
  laborType: z.enum(["MOD", "MOI"]).default("MOD"),
});

import { emptyToUndefined } from "@/lib/utils/validators/schemas";

const querySchema = paginationQuerySchema.extend({
  companyId: z.preprocess(
    emptyToUndefined,
    z.string().uuid().optional().nullable(),
  ),
  siteId: z.preprocess(
    emptyToUndefined,
    z.string().uuid().optional().nullable(),
  ),
  isActive: z.preprocess(
    emptyToUndefined,
    z.enum(["true", "false"]).optional().nullable(),
  ),
});

// ===== HEAD (Health Check) =====
export async function HEAD() {
  return ApiResponse.noContent();
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = Validator.validateQuery(
      querySchema,
      request.nextUrl.searchParams,
    );
    if (!validation.success) return validation.response;

    const {
      page = API.PAGINATION.DEFAULT_PAGE,
      limit = API.PAGINATION.DEFAULT_LIMIT,
      companyId,
      siteId,
      isActive,
    } = validation.data as any;

    const { isUserAdmin: checkAdmin } = await import("@/lib/auth/session");
    const isAdmin = checkAdmin(user.role);

    // Parametros para o Service
    const serviceParams: any = {
      page,
      limit,
      companyId: isAdmin ? companyId || undefined : user.companyId || undefined,
      siteId,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
    };

    const result = await service.listTeams(serviceParams);

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/teams/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = Validator.validate(createTeamSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data as any;

    const team = await service.createTeam(data);

    logger.info("Equipe criada", { teamId: team.id });

    return ApiResponse.created(team, "Equipe criada com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/teams/route.ts#POST");
  }
}
