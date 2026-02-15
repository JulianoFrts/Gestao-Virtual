import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireOwnerOrAdmin } from "@/lib/auth/session";
import { MapVisibilityService } from "@/modules/map-elements/application/map-visibility.service";
import { PrismaMapVisibilityRepository } from "@/modules/map-elements/infrastructure/prisma-map-visibility.repository";

// DI
const visibilityService = new MapVisibilityService(
  new PrismaMapVisibilityRepository(),
);

/**
 * Mapeia os campos do corpo da requisição (que podem vir em camelCase ou snake_case)
 * para o formato esperado pelo modelo MapElementVisibility no Prisma.
 */
function mapBodyToVisibilityData(body: any) {
  const data: any = {};

  // Mapeamento de campos com fallback para snake_case
  const mappings: Record<string, string[]> = {
    elementName: ["elementName", "element_name", "name"],
    isHidden: ["isHidden", "is_hidden"],
    elementColor: ["elementColor", "element_color", "color"],
    elementHeight: ["elementHeight", "element_height", "height"],
    elementElevation: ["elementElevation", "element_elevation", "elevation"],
    elementAngle: ["elementAngle", "element_angle", "angle"],
    customModelUrl: ["customModelUrl", "custom_model_url"],
    customModelTransform: ["customModelTransform", "custom_model_transform"],
  };

  for (const [targetField, sourceFields] of Object.entries(mappings)) {
    for (const sourceField of sourceFields) {
      if (body[sourceField] !== undefined) {
        data[targetField] = body[sourceField];
        break;
      }
    }
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;

    const targetUserId =
      searchParams.get("user_id") || searchParams.get("userId") || user.id;
    await requireOwnerOrAdmin(targetUserId);

    const visibility = await visibilityService.listVisibility(targetUserId);

    return ApiResponse.json(visibility);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const projectId = body.project_id || body.projectId;
    const elementId = body.element_id || body.elementId;
    const documentId = body.document_id || body.documentId || null;

    if (!projectId || !elementId) {
      return ApiResponse.badRequest("projectId e elementId são obrigatórios");
    }

    const visibilityData = mapBodyToVisibilityData(body);

    const result = await visibilityService.saveVisibility(user.id, {
      projectId,
      elementId,
      documentId,
      ...visibilityData,
    });

    return ApiResponse.json(
      result,
      "Configurações de visibilidade atualizadas",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  return handleBulkUpdate(request);
}

export async function PATCH(request: NextRequest) {
  return handleBulkUpdate(request);
}

async function handleBulkUpdate(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { searchParams } = request.nextUrl;

    const targetUserId =
      searchParams.get("userId") || searchParams.get("user_id");
    const projectId =
      searchParams.get("projectId") || searchParams.get("project_id");

    if (!targetUserId) {
      return ApiResponse.badRequest(
        "Para atualização em massa, forneça userId como parâmetro de consulta.",
      );
    }

    await requireOwnerOrAdmin(targetUserId);

    const updateData = mapBodyToVisibilityData(body);
    delete updateData.elementName;

    const result = await visibilityService.bulkUpdate(
      targetUserId,
      projectId || null,
      updateData,
    );

    return ApiResponse.json(
      { count: result.count },
      `Visibilidade atualizada para ${result.count} elementos.`,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
