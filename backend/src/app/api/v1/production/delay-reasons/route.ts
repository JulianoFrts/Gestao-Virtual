import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import { PrismaProductionConfigRepository } from "@/modules/production/infrastructure/prisma-production-config.repository";

// DI
const configRepository = new PrismaProductionConfigRepository();
const configService = new ProductionConfigService(configRepository);

const delayReasonSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  dailyCost: z.number().min(0),
  category: z
    .enum(["NONE", "OWNER", "CONTRACTOR", "PROJECT", "WORK"])
    .default("NONE"),
});

/**
 * GET - Listar motivos de atraso do projeto
 */
export async function GET(request: NextRequest) {
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
    return handleApiError(error);
  }
}

/**
 * POST - Criar novo motivo de atraso
 */
export async function POST(request: NextRequest) {
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
  } catch (error: any) {
    if (error.message.includes("Não é possível criar um motivo")) {
      return ApiResponse.badRequest(error.message);
    }
    return handleApiError(error);
  }
}

/**
 * DELETE - Remover motivo
 */
export async function DELETE(request: NextRequest) {
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
    return handleApiError(error);
  }
}
