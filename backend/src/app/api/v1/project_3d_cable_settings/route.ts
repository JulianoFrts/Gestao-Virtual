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
import { ProjectService } from "@/modules/projects/application/project.service";
import { PrismaProjectRepository } from "@/modules/projects/infrastructure/prisma-project.repository";

const service = new ProjectService(new PrismaProjectRepository());

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
    return handleApiError(
      error,
      "src/app/api/v1/project_3d_cable_settings/route.ts#GET",
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await request.json();

    // Tenta extrair projectId e settings de múltiplas formas para garantir compatibilidade
    const projectId =
      body.projectId || body.project_id || body.settings?.projectId;
    const settings = body.settings !== undefined ? body.settings : body;

    if (!projectId) {
      logger.error("Falha ao salvar configurações 3D: projectId ausente", {
        body,
      });
      return ApiResponse.badRequest("projectId é obrigatório");
    }

    // Se o settings for o objeto raiz que contém o projectId, removemos ele para limpar o JSON de settings
    const cleanSettings = { ...settings };
    if (cleanSettings.projectId) delete cleanSettings.projectId;
    if (cleanSettings.project_id) delete cleanSettings.project_id;

    const result = await service.upsert3dCableSettings(
      projectId,
      cleanSettings,
    );

    logger.info("Configurações de cabo 3D salvas com sucesso", {
      projectId,
    });
    return ApiResponse.json(result, "Configurações salvas com sucesso");
  } catch (error: any) {
    logger.error("Erro fatal ao salvar configurações 3D", {
      message: error.message,
      stack: error.stack,
    });
    return handleApiError(
      error,
      "src/app/api/v1/project_3d_cable_settings/route.ts#POST",
    );
  }
}
