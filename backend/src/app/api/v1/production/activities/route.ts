import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import { PrismaProductionRepository } from "@/modules/production/infrastructure/prisma-production.repository";
import { z } from "zod";
import { VALIDATION } from "@/lib/constants";

// DI
const productionRepository = new PrismaProductionRepository();
const configService = new ProductionConfigService(productionRepository);

const createActivitySchema = z.object({
  name: z.string().min(2).max(VALIDATION.STRING.MAX_NAME),
  description: z.string().optional(),
  categoryId: z.string().uuid("ID da categoria é obrigatório e deve ser um UUID válido"),
  weight: z.number().optional(),
  order: z.number().optional(),
});

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
    const validation = createActivitySchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.errors.map(e => e.message));
    }

    const activity = await configService.createActivity(validation.data);

    return ApiResponse.created(activity, "Atividade criada com sucesso");
  } catch (error) {
    return handleApiError(error);
  }
}
