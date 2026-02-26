import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireOwnerOrAdmin } from "@/lib/auth/session";
import { MapVisibilityService } from "@/modules/map-elements/application/map-visibility.service";
import { PrismaMapVisibilityRepository } from "@/modules/map-elements/infrastructure/prisma-map-visibility.repository";
import { z } from "zod";

// DI
const visibilityService = new MapVisibilityService(
  new PrismaMapVisibilityRepository(),
);

// Schemas Zod para Validação e Transformação
const visibilityBaseSchema = z.object({
  elementName: z.string().optional(),
  element_name: z.string().optional(),
  name: z.string().optional(),
  isHidden: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
  elementColor: z.string().optional(),
  element_color: z.string().optional(),
  color: z.string().optional(),
  elementHeight: z.number().optional(),
  element_height: z.number().optional(),
  height: z.number().optional(),
  elementElevation: z.number().optional(),
  element_elevation: z.number().optional(),
  elevation: z.number().optional(),
  elementAngle: z.number().optional(),
  element_angle: z.number().optional(),
  angle: z.number().optional(),
  customModelUrl: z.string().optional().nullable(),
  custom_model_url: z.string().optional().nullable(),
  customModelTransform: z.record(z.unknown()).optional().nullable(),
  custom_model_transform: z.record(z.unknown()).optional().nullable(),
});

const postVisibilitySchema = visibilityBaseSchema.extend({
  projectId: z.string().optional(),
  project_id: z.string().optional(),
  elementId: z.string().optional(),
  element_id: z.string().optional(),
  documentId: z.string().optional().nullable(),
  document_id: z.string().optional().nullable(),
}).refine(payload => (data.projectId || data.project_id) && (data.elementId || data.element_id), {
  message: "projectId e elementId são obrigatórios",
});

/**
 * Normaliza os campos do corpo da requisição (camelCase ou snake_case) O(1)
 */
function normalizeVisibilityData(body: z.infer<typeof visibilityBaseSchema>) {
  return {
    elementName: body.elementName ?? body.element_name ?? body.name,
    isHidden: body.isHidden ?? body.is_hidden,
    elementColor: body.elementColor ?? body.element_color ?? body.color,
    elementHeight: body.elementHeight ?? body.element_height ?? body.height,
    elementElevation: body.elementElevation ?? body.element_elevation ?? body.elevation,
    elementAngle: body.elementAngle ?? body.element_angle ?? body.angle,
    customModelUrl: body.customModelUrl ?? body.custom_model_url,
    customModelTransform: body.customModelTransform ?? body.custom_model_transform,
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;

    const targetUserId =
      searchParams.get("user_id") || searchParams.get("userId") || user.id;
    await requireOwnerOrAdmin(targetUserId);

    const visibility = await visibilityService.listVisibility(targetUserId);

    return ApiResponse.json(visibility);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/map_element_visibility/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();

    const validation = postVisibilitySchema.safeParse(rawBody);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const body = validation.data;
    const projectId = body.projectId || body.project_id;
    const elementId = body.elementId || body.element_id;
    const documentId = body.documentId || body.document_id || null;

    const visibilityData = normalizeVisibilityData(body);

    const result = await visibilityService.saveVisibility(user.id, {
      projectId: projectId!,
      elementId: elementId!,
      documentId,
      ...visibilityData,
    });

    return ApiResponse.json(
      result,
      "Configurações de visibilidade atualizadas",
    );
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/map_element_visibility/route.ts#POST");
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  return handleBulkUpdate(request);
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return handleBulkUpdate(request);
}

async function handleBulkUpdate(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth(); // Utilizado para validação de contexto na função requireOwnerOrAdmin
    const rawBody = await request.json();
    const { searchParams } = request.nextUrl;

    const validation = visibilityBaseSchema.safeParse(rawBody);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

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

    const updateData = normalizeVisibilityData(validation.data);
    delete updateData.elementName; // Conforme lógica original

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
    return handleApiError(error, "src/app/api/v1/map_element_visibility/route.ts#BULK_UPDATE");
  }
}
