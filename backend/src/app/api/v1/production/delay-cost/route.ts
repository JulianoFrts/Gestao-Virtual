import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import { PrismaProductionConfigRepository } from "@/modules/production/infrastructure/prisma-production-config.repository";
import { PrismaProductionCatalogueRepository } from "@/modules/production/infrastructure/prisma-production-catalogue.repository";

const configRepo = new PrismaProductionConfigRepository();
const catalogueRepo = new PrismaProductionCatalogueRepository();
const service = new ProductionConfigService(configRepo, catalogueRepo);

const delayCostSchema = z.object({
  dailyCost: z.number().min(0),
  currency: z.string().default("BRL"),
  description: z.string().optional(),
});

/**
 * GET - Obtém configuração de custo de atraso do projeto
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("Project ID is required");
    }

    const config = await service.getDelayCostConfig(user.companyId!, projectId);

    return ApiResponse.json(config || { dailyCost: 0 /* literal */, currency: "BRL" });
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/production/delay-cost/route.ts#GET",
    );
  }
}

/**
 * POST - Configura custo de atraso
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();

    if (!user.companyId) {
      return ApiResponse.badRequest("User must belong to a company");
    }

    const body = await request.json();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("Project ID is required");
    }

    const data = delayCostSchema.parse(body);

    const config = await service.upsertDelayCostConfig({
      companyId: user.companyId,
      projectId,
      dailyCost: data.dailyCost,
      currency: data.currency,
      description: data.description,
      updatedById: user.id,
    });

    return ApiResponse.json(config, "Configuração de custo salva com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/production/delay-cost/route.ts#POST",
    );
  }
}
