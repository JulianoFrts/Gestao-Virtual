import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { SiteService } from "@/modules/sites/application/site.service";
import { PrismaSiteRepository } from "@/modules/sites/infrastructure/prisma-site.repository";
import { VALIDATION } from "@/lib/constants";

// DI
const siteService = new SiteService(new PrismaSiteRepository());

const updateSiteSchema = z.object({
  name: z.string().min(2).max(VALIDATION.STRING.MAX_NAME).optional(),
  code: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (schemaInput === "" ? null : val)),
  locationDetails: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (schemaInput === "" ? null : val)),
  plannedHours: z.preprocess(
    (val) => (schemaInput === "" || schemaInput === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  xLat: z.preprocess(
    (val) => (schemaInput === "" || schemaInput === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  yLa: z.preprocess(
    (val) => (schemaInput === "" || schemaInput === null ? undefined : val),
    z.coerce.number().optional(),
  ),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;
    const user = await authSession.requireAuth();

    const site = await siteService.getSiteById(id);
    if (!site) return ApiResponse.notFound("Canteiro não encontrado");

    // Validação de Escopo: Canteiro -> Projeto -> Empresa
    const { prisma } = await import("@/lib/prisma/client");
    const project = await prisma.project.findUnique({
      where: { id: (site as unknown).projectId },
      select: { companyId: true },
    });

    if (
      project &&
      project.companyId !== user.companyId &&
      !authSession.isGlobalAdmin(
        user.role,
        user.hierarchyLevel || 0,
        (user.permissions as Record<string, boolean>),
      )
    ) {
      return ApiResponse.forbidden("Você não tem acesso a este canteiro");
    }

    return ApiResponse.json(site);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/sites/[id]/route.ts#GET");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;
    const user = await authSession.requirePermission("sites.manage", request);

    const existingSite = await siteService.getSiteById(id);
    if (!existingSite) return ApiResponse.notFound("Canteiro não encontrado");

    // Validação de Escopo
    const { prisma } = await import("@/lib/prisma/client");
    const project = await prisma.project.findUnique({
      where: { id: (existingSite as unknown).projectId },
      select: { companyId: true },
    });

    if (
      project &&
      project.companyId !== user.companyId &&
      !authSession.isGlobalAdmin(
        user.role,
        user.hierarchyLevel || 0,
        (user.permissions as Record<string, boolean>),
      )
    ) {
      return ApiResponse.forbidden(
        "Não autorizado a alterar canteiros de outra empresa",
      );
    }

    const body = await request.json();
    const siteData = updateSiteSchema.parse(body);

    const site = await siteService.updateSite(id, siteData);

    logger.info("Site atualizado", { siteId: site.id });

    return ApiResponse.json(site, "Site atualizado com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/sites/[id]/route.ts#PUT");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;
    const user = await authSession.requirePermission("sites.manage", request);

    const existingSite = await siteService.getSiteById(id);
    if (!existingSite) return ApiResponse.notFound("Canteiro não encontrado");

    // Validação de Escopo
    const { prisma } = await import("@/lib/prisma/client");
    const project = await prisma.project.findUnique({
      where: { id: (existingSite as unknown).projectId },
      select: { companyId: true },
    });

    if (
      project &&
      project.companyId !== user.companyId &&
      !authSession.isGlobalAdmin(
        user.role,
        user.hierarchyLevel || 0,
        (user.permissions as Record<string, boolean>),
      )
    ) {
      return ApiResponse.forbidden(
        "Não autorizado a remover canteiros de outra empresa",
      );
    }

    await siteService.deleteSite(id);

    logger.info("Site removido", { siteId: id });

    return ApiResponse.noContent();
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/sites/[id]/route.ts#DELETE");
  }
}
