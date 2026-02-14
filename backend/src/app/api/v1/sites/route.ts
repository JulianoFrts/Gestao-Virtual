/**
 * Sites API - GESTÃO VIRTUAL Backend
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/core/common/domain/common.schema";
import { z } from "zod";
import { emptyToUndefined } from "@/lib/utils/validators/schemas";
import { PrismaSiteRepository } from "@/modules/sites/infrastructure/prisma-site.repository";
import { SiteService } from "@/modules/sites/application/site.service";

// Inicialização do Service (Dependency Injection)
const repository = new PrismaSiteRepository();
const service = new SiteService(repository);

const createSiteSchema = z.object({
  projectId: z.string().uuid("ID do projeto deve ser um UUID válido"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(255),
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
  responsibleIds: z.array(z.string().uuid()).optional().default([]),
});


const querySchema = paginationQuerySchema.extend({
  projectId: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  search: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = Validator.validateQuery(
      querySchema,
      request.nextUrl.searchParams,
    );
    if (!validation.success) return validation.response;

    const { page = 1, limit = 10, projectId, search } = validation.data as any;

    const { isUserAdmin: checkAdmin } = await import("@/lib/auth/session");
    const isAdmin = checkAdmin(user.role);

    const result = await service.listSites({
      page,
      limit,
      projectId,
      search,
      isAdmin,
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
    await requireAdmin();

    const body = await request.json();
    const validation = Validator.validate(createSiteSchema, body);
    if (!validation.success) return validation.response;

    const site = await service.createSite(validation.data);

    logger.info("Site criado", { siteId: site.id });

    return ApiResponse.created(site, "Site criado com sucesso");
  } catch (error: any) {
    if (error.message === "Projeto não encontrado") {
      return ApiResponse.badRequest(error.message);
    }
    return handleApiError(error, "src/app/api/v1/sites/route.ts#POST");
  }
}
