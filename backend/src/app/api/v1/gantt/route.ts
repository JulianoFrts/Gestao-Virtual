import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { PrismaGanttRepository } from "@/modules/production/infrastructure/prisma-gantt.repository";
import { GanttService } from "@/modules/production/application/gantt.service";

const repository = new PrismaGanttRepository();
const service = new GanttService(repository);

/**
 * GET /api/v1/gantt
 * Retorna a estrutura de EAP (WBS) + dados de cronograma para visualização de Gantt
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId é obrigatório");
    }

    const roots = await service.getGanttData(projectId, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: (user as any).hierarchyLevel,
      permissions: (user as any).permissions,
    });

    return ApiResponse.json({
      projectId,
      stages: roots,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return ApiResponse.forbidden(error.message);
    }
    return handleApiError(error, "src/app/api/v1/gantt/route.ts#GET");
  }
}
