import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import { PrismaProductionRepository } from "@/modules/production/infrastructure/prisma-production.repository";

// DI
const productionRepository = new PrismaProductionRepository();
const configService = new ProductionConfigService(productionRepository);

/**
 * GET - Lista todas as categorias de produção
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const categories = await configService.listCategories();
    console.log(`[DEBUG] Found ${categories.length} production categories`);

    return ApiResponse.json(categories);
  } catch (error) {
    console.error("[DEBUG] Error in categories GET:", error);
    return handleApiError(error);
  }
}

/**
 * POST - Cria uma nova categoria de produção
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const category = await configService.createCategory({
      name: body.name,
      description: body.description,
      order: body.order,
    });

    return ApiResponse.created(category, "Categoria criada com sucesso");
  } catch (error) {
    return handleApiError(error);
  }
}
