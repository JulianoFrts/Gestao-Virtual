import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { SiteService } from "@/modules/sites/application/site.service";
import { PrismaSiteRepository } from "@/modules/sites/infrastructure/prisma-site.repository";

// DI
const siteService = new SiteService(new PrismaSiteRepository());

const updateSiteSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  code: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  locationDetails: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  plannedHours: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  xLat: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  yLa: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAuth();

    const site = await siteService.getSiteById(id);

    return ApiResponse.json(site);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/sites/[id]/route.ts#GET");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAdmin();

    const body = await request.json();
    const data = updateSiteSchema.parse(body);

    const site = await siteService.updateSite(id, data);

    logger.info("Site atualizado", { siteId: site.id });

    return ApiResponse.json(site, "Site atualizado com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/sites/[id]/route.ts#PUT");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAdmin();

    await siteService.deleteSite(id);

    logger.info("Site removido", { siteId: id });

    return ApiResponse.noContent();
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/sites/[id]/route.ts#DELETE");
  }
}
