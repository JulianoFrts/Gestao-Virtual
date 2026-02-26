import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import { PrismaProductionConfigRepository } from "@/modules/production/infrastructure/prisma-production-config.repository";
import { PrismaProductionCatalogueRepository } from "@/modules/production/infrastructure/prisma-production-catalogue.repository";
import { VALIDATION } from "@/lib/constants";

// DI
const configRepo = new PrismaProductionConfigRepository();
const catalogueRepo = new PrismaProductionCatalogueRepository();
const configService = new ProductionConfigService(configRepo, catalogueRepo);

const delayReasonSchema = z.object({
  code: z.string().min(1).max(VALIDATION.STRING.MAX_NAME),
  description: z.string().min(1).max(VALIDATION.STRING.MAX_NAME),
  dailyCost: z.number().min(0),
  category: z
    .enum(["NONE", "OWNER", "CONTRACTOR", "PROJECT", "WORK"])
    .default("NONE"),
});

/**
 * GET - Listar motivos de atraso do projeto
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("Project ID is required");
    }

    const reasons = await configService.listDelayReasons(projectId);

    return ApiResponse.json(reasons);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/production/delay-reasons/route.ts#GET");
  }
}

/**
 * POST - Criar novo motivo de atraso
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("Project ID is required");
    }

    const body = await request.json();
    const data = delayReasonSchema.parse(body);

    const reason = await configService.createDelayReason({
      projectId,
      ...data,
      updatedById: user.id,
    });

    return ApiResponse.json(reason, "Motivo de atraso criado com sucesso");
  } catch (error: unknown) {
    if (error.message.includes("Não é possível criar um motivo")) {
      return ApiResponse.badRequest(error.message);
    }
    return handleApiError(error, "src/app/api/v1/production/delay-reasons/route.ts#POST");
  }
}

/**
 * DELETE - Remover motivo
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.badRequest("ID is required");
    }

    await configService.deleteDelayReason(id);

    return ApiResponse.json(null, "Motivo removido com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/production/delay-reasons/route.ts#DELETE");
  }
}
