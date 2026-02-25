/**
 * Sites API - GESTÃO VIRTUAL Backend
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/modules/common/domain/common.schema";
import { z } from "zod";
import { emptyToUndefined } from "@/lib/utils/validators/schemas";
import { PrismaSiteRepository } from "@/modules/sites/infrastructure/prisma-site.repository";
import { SiteService } from "@/modules/sites/application/site.service";
import { VALIDATION, API } from "@/lib/constants";

// Inicialização do Service (Dependency Injection)
const repository = new PrismaSiteRepository();
const service = new SiteService(repository);

const createSiteSchema = z.object({
  projectId: z.string().min(1, "ID do projeto é obrigatório"),
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
  locationDetails: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  plannedHours: z.preprocess(
    (val) => (val === "" || val === null ? 0 : val),
    z.coerce.number().optional().default(0),
  ),
  xLat: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  yLa: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  responsibleIds: z.array(z.string().min(1)).optional().default([]),
});

const querySchema = paginationQuerySchema.extend({
  projectId: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  search: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
});

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
      projectId,
      search,
    } = validation.data as any;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      user.role,
      (user as any).hierarchyLevel,
      (user as any).permissions,
    );

    const result = await service.listSites({
      page,
      limit,
      projectId,
      search,
      isGlobalAccess: isGlobal,
      companyId: user.companyId || undefined,
    });

    return ApiResponse.json(result);
  } catch (error: any) {
    if (error.message === "Projeto não encontrado ou acesso negado") {
      return ApiResponse.notFound(error.message);
    }
    return handleApiError(error, "src/app/api/v1/sites/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authSession.requirePermission("sites.manage", request);

    const body = await request.json();
    const validation = Validator.validate(createSiteSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data as any;

    // Validação de Escopo: Verificar se o projeto alvo pertence à mesma empresa do usuário
    // Se o usuário não for admin sistêmico, forçamos o filtro pela empresa dele no service
    if (
      !authSession.isUserAdmin(
        (user as any).role,
        (user as any).hierarchyLevel,
        (user as any).permissions,
      )
    ) {
      // O service já faz validação de projeto dentro do listSites, mas no createSite
      // precisamos garantir que o projectId fornecido pertença à empresa do usuário logado.
      const { prisma } = await import("@/lib/prisma/client");
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, companyId: (user as any).companyId },
      });
      if (!project) {
        return ApiResponse.forbidden(
          "Projeto não encontrado ou você não tem permissão para adicionar canteiros neste projeto.",
        );
      }
    }

    const site = await service.createSite(data);

    logger.info("Site criado", { siteId: site.id });

    return ApiResponse.created(site, "Site criado com sucesso");
  } catch (error: any) {
    if (error.message === "Projeto não encontrado") {
      return ApiResponse.badRequest(error.message);
    }
    return handleApiError(error, "src/app/api/v1/sites/route.ts#POST");
  }
}
