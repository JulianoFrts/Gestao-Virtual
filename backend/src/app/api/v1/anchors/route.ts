import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { AnchorService } from "@/modules/map-elements/application/anchor.service";
import { PrismaAnchorRepository } from "@/modules/map-elements/infrastructure/prisma-anchor.repository";
import { validate, anchorListSchema } from "@/lib/utils/validators/schemas";
import { requireAuth, requireScope } from "@/lib/auth/session";

// DI
const anchorService = new AnchorService(new PrismaAnchorRepository());

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const companyId = searchParams.get("companyId");
  const projectId = searchParams.get("projectId");
  const towerId = searchParams.get("towerId");
  const modelUrl = searchParams.get("modelUrl");

  try {
    await requireAuth();
    // Validação básica de parâmetros obrigatórios
    if (!companyId || !projectId) {
      return ApiResponse.badRequest("companyId e projectId são obrigatórios");
    }

    await requireScope(companyId, "COMPANY", request);

    const result = await anchorService.getAnchors({
      companyId,
      projectId,
      towerId,
      modelUrl,
    });

    return ApiResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/anchors/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await request.json();
    
    // Validação de Schema
    const validation = validate(anchorListSchema, body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.errors);
    }

    // Se houver companyId no primeiro item, validamos escopo
    if (validation.data[0]?.companyId) {
        await requireScope(validation.data[0].companyId, "COMPANY", request);
    }

    const result = await anchorService.saveAnchors(validation.data);

    return ApiResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/anchors/route.ts#POST");
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const companyId = searchParams.get("companyId");
  const projectId = searchParams.get("projectId");
  const towerId = searchParams.get("towerId");

  try {
    await requireAuth();
    if (companyId) {
        await requireScope(companyId, "COMPANY", request);
    }

    await anchorService.deleteAnchors({
      id,
      companyId,
      projectId,
      towerId,
    });

    return ApiResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/anchors/route.ts#DELETE");
  }
}
