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
    (val) => (schemaInput === "" || schemaInput === null ? 0 : val),
    z.coerce.number().optional().default(0),
  ),
  xLat: z.preprocess(
    (val) => (schemaInput === "" || schemaInput === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  yLa: z.preprocess(
    (val) => (schemaInput === "" || schemaInput === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  responsibleIds: z.array(z.string().min(1)).optional().default([]),
});

const querySchema = paginationQuerySchema.extend({
  projectId: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  search: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
});

export async function GET(request: NextRequest): Promise<Response> {
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
     } = validation.data;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      user.role,
      user.hierarchyLevel,
      (user.permissions as Record<string, boolean>),
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
  } catch (error: unknown) {
    if (error?.message === "Projeto não encontrado ou acesso negado") {
      return ApiResponse.notFound(error.message);
    }
    return handleApiError(error, "src/app/api/v1/sites/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requireAuth(); // sites.manage is checked inside logic or via separate middleware if needed, but let's stick to the prompt's focus on low severities like generic names.
    // The previous code had requirePermission, keeping it consistent with the intent while fixing the generic names.
    await authSession.requirePermission("sites.manage", request);

    const body = await request.json();
    const validation = Validator.validate(createSiteSchema, body);
    if (!validation.success) return validation.response;

    const siteData = validation.data as unknown;

    // Validação de Escopo: Verificar se o projeto alvo pertence à mesma empresa do usuário
    // Se o usuário não for admin sistêmico, forçamos o filtro pela empresa dele no service
    if (
      !authSession.isUserAdmin(
        user.role,
        user.hierarchyLevel || 0,
        (user.permissions as Record<string, boolean>),
      )
    ) {
      // O service já faz validação de projeto dentro do listSites, mas no createSite
      // precisamos garantir que o projectId fornecido pertença à empresa do usuário logado.
      const { prisma } = await import("@/lib/prisma/client");
      const project = await prisma.project.findFirst({
        where: { id: siteData.projectId, companyId: user.companyId },
      });
      if (!project) {
        return ApiResponse.forbidden(
          "Projeto não encontrado ou você não tem permissão para adicionar canteiros neste projeto.",
        );
      }
    }

    const site = await service.createSite(siteData);

    logger.info("Site criado", { siteId: site.id });

    return ApiResponse.created(site, "Site criado com sucesso");
  } catch (error: unknown) {
    if (error?.message === "Projeto não encontrado") {
      return ApiResponse.badRequest(error.message);
    }
    return handleApiError(error, "src/app/api/v1/sites/route.ts#POST");
  }
}
