/**
 * Teams API - GESTÃO VIRTUAL Backend
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/modules/common/domain/common.schema";
import { PrismaTeamRepository } from "@/modules/teams/infrastructure/prisma-team.repository";
import { TeamService } from "@/modules/teams/application/team.service";
import { VALIDATION, API } from "@/lib/constants";

// Inicialização do Service (Dependency Injection)
const repository = new PrismaTeamRepository();
const service = new TeamService(repository);

const createTeamSchema = z.object({
  companyId: z.string().optional(),
  siteId: z.string().optional(),
  projectId: z.string().optional(),
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(VALIDATION.STRING.MAX_NAME),
  supervisorId: z.string().optional(),
  displayOrder: z.number().default(0),
  laborType: z.enum(["MOD", "MOI"]).default("MOD"),
});

import { emptyToUndefined } from "@/lib/utils/validators/schemas";

const querySchema = paginationQuerySchema.extend({
  companyId: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  siteId: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  projectId: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
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
    const user = await authSession.requireAuth();

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
      projectId,
      isActive,
    } = validation.data as any;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      user.role,
      (user as any).hierarchyLevel,
      (user as any).permissions,
    );

    // Parametros para o Service
    const serviceParams: any = {
      page,
      limit,
      companyId: isGlobal
        ? companyId || undefined
        : user.companyId || undefined,
      siteId,
      projectId,
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
    const user = await authSession.requirePermission("teams.manage", request);
    const body = await request.json();
    const validation = Validator.validate(createTeamSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data as any;

    // Validação de Escopo: Usuário só pode criar equipe para sua própria empresa (se não for admin sistêmico)
    const targetCompanyId = data.companyId || (user as any).companyId;
    await authSession.requireScope(targetCompanyId, "COMPANY", request);

    // Garantir que a equipe seja criada vinculada à empresa correta
    data.companyId = targetCompanyId;

    const team = await service.createTeam(data);

    logger.info("Equipe criada", { teamId: team.id });

    return ApiResponse.created(team, "Equipe criada com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/teams/route.ts#POST");
  }
}
