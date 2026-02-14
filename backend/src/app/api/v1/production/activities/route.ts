import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import { PrismaProductionRepository } from "@/modules/production/infrastructure/prisma-production.repository";

// DI
const productionRepository = new PrismaProductionRepository();
const configService = new ProductionConfigService(productionRepository);

/**
 * GET - Lista atividades de produção (opcionalmente filtradas por categoria)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const categoryId = searchParams.get("categoryId") || undefined;

    const activities = await configService.listActivities(categoryId);

    return ApiResponse.json(activities);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST - Cria uma nova atividade de produção
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const activity = await configService.createActivity({
      name: body.name,
      description: body.description,
      categoryId: body.categoryId,
      weight: body.weight,
      order: body.order,
    });

    return ApiResponse.created(activity, "Atividade criada com sucesso");
  } catch (error) {
    return handleApiError(error);
  }
}
