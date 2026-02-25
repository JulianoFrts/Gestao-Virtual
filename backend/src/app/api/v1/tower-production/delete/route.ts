import { NextRequest } from "next/server";
import { requireAuth, isUserAdmin } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

/**
 * DELETE de torres de PRODUÇÃO.
 * Remove: MapElementTechnicalData + TowerProduction
 * NÃO toca em: TowerConstruction (dados técnicos)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { ids, projectId } = body;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      user.role,
      (user as any).hierarchyLevel,
      (user as any).permissions,
    );

    if (!isGlobal) {
      return ApiResponse.forbidden(
        "Apenas administradores globais podem remover dados de produção.",
      );
    }

    // Modo 1: Excluir por IDs (MapElementTechnicalData IDs)
    if (Array.isArray(ids) && ids.length > 0) {
      // 1. Buscar externalIds para limpar TowerProduction correspondentes
      const elements = await prisma.mapElementTechnicalData.findMany({
        where: { id: { in: ids } },
        select: { externalId: true, projectId: true },
      });

      if (elements.length > 0) {
        const towerIds = elements.map((e: any) => e.externalId);
        const elProjectId = elements[0].projectId;

        // 2. Deletar TowerProduction correspondentes (SEM tocar TowerConstruction)
        await prisma.towerProduction.deleteMany({
          where: { projectId: elProjectId, towerId: { in: towerIds } },
        });
      }

      // 3. Deletar dos MapElementTechnicalData (remove da view de produção)
      const count = await prisma.mapElementTechnicalData.deleteMany({
        where: { id: { in: ids } },
      });

      logger.info(
        `[PRODUCTION_DELETE] Removed ${count.count} production elements (kept TowerConstruction intact)`,
      );
      return ApiResponse.json({ deleted: count.count });
    }

    // Modo 2: Excluir TODAS as torres de produção de um projeto
    if (projectId) {
      // 1. Deletar todos TowerProduction do projeto
      await prisma.towerProduction.deleteMany({
        where: { projectId },
      });

      // 2. Deletar todos MapElementTechnicalData do projeto (remove da view)
      const count = await prisma.mapElementTechnicalData.deleteMany({
        where: { projectId, elementType: "TOWER" },
      });

      logger.info(
        `[PRODUCTION_DELETE] Removed ${count.count} production elements for project ${projectId} (kept TowerConstruction intact)`,
      );
      return ApiResponse.json({ deleted: count.count });
    }

    return ApiResponse.badRequest("ids array ou projectId obrigatório.");
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-production/delete/route.ts#POST",
    );
  }
}
