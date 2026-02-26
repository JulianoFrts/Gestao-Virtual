import { NextRequest } from "next/server";
import { requireAuth, isUserAdmin } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

import { z } from "zod";

const deleteProductionSchema = z.object({
  ids: z.array(z.string()).optional(),
  projectId: z.string().optional(),
}).refine(payload => data.ids || data.projectId, {
  message: "ids array ou projectId obrigatório",
});

/**
 * DELETE de torres de PRODUÇÃO.
 * Remove: MapElementTechnicalData + TowerProduction
 * NÃO toca em: TowerConstruction (dados técnicos)
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await req.json();
    
    const validation = deleteProductionSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.badRequest(validation.error.issues[0].message);
    }

    const { ids, projectId } = validation.data;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    if (!isGlobalAdmin(user.role, user.hierarchyLevel, user.permissions as Record<string, boolean>)) {
      return ApiResponse.forbidden("Apenas administradores globais podem remover dados de produção.");
    }

    if (ids && ids.length > 0) {
      const count = await deleteProductionByIds(ids);
      return ApiResponse.json({ deleted: count });
    }

    if (projectId) {
      const count = await deleteProductionByProject(projectId);
      return ApiResponse.json({ deleted: count });
    }

    return ApiResponse.badRequest("ids array ou projectId obrigatório.");
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/tower-production/delete/route.ts#POST");
  }
}

async function deleteProductionByIds(ids: string[]): Promise<number> {
  const elements = await prisma.mapElementTechnicalData.findMany({
    where: { id: { in: ids } },
    select: { externalId: true, projectId: true },
  });

  if (elements.length > 0) {
    const towerIds = elements.map((e) => e.externalId).filter((id): id is string => !!id);
    const elProjectId = elements[0].projectId;
    await prisma.towerProduction.deleteMany({
      where: { projectId: elProjectId, towerId: { in: towerIds } },
    });
  }

  const count = await prisma.mapElementTechnicalData.deleteMany({
    where: { id: { in: ids } },
  });

  logger.info(`[PRODUCTION_DELETE] Removed ${count.count} production elements by IDs`);
  return count.count;
}

async function deleteProductionByProject(projectId: string): Promise<number> {
  await prisma.towerProduction.deleteMany({ where: { projectId } });
  const count = await prisma.mapElementTechnicalData.deleteMany({
    where: { projectId, elementType: "TOWER" },
  });

  logger.info(`[PRODUCTION_DELETE] Removed ${count.count} production elements for project ${projectId}`);
  return count.count;
}
