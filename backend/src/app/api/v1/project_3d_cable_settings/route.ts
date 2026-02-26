/**
 * project_3d_cable_settings API - GESTÃO VIRTUAL Backend
 *
 * Endpoint: /api/v1/project_3d_cable_settings
 *
 * GET  - Carrega configurações de cabo 3D de um projeto
 * POST - Salva/Atualiza configurações
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { ProjectService } from "@/modules/projects/application/project.service";
import { PrismaProjectRepository } from "@/modules/projects/infrastructure/prisma-project.repository";

const service = new ProjectService(new PrismaProjectRepository());

const settingsSchema = z.object({
  projectId: z.string().optional(),
  project_id: z.string().optional(),
  settings: z.any(),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const projectId =
      searchParams.get("projectId") || searchParams.get("project_id");

    if (!projectId) {
      return ApiResponse.badRequest("projectId é obrigatório");
    }

    const settings = await service.get3dCableSettings(projectId);

    if (!settings) {
      return ApiResponse.json({ projectId, settings: {} });
    }

    return ApiResponse.json(settings);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/project_3d_cable_settings/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await request.json();

    const parseResult = settingsSchema.safeParse(body);
    if (!parseResult.success) {
      return ApiResponse.badRequest(
        "Configurações inválidas",
        parseResult.error.issues.map((e) => e.message),
      );
    }

    const { projectId, project_id, settings } = parseResult.data;
    const targetProjectId = projectId || project_id;

    if (!targetProjectId) {
      return ApiResponse.badRequest("projectId é obrigatório");
    }

    const result = await service.upsert3dCableSettings(
      targetProjectId,
      settings,
    );

    logger.info("Configurações de cabo 3D salvas", {
      projectId: targetProjectId,
    });
    return ApiResponse.json(result, "Configurações salvas com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/project_3d_cable_settings/route.ts#POST");
  }
}
