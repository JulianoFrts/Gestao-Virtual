import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, isUserAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/core/common/domain/common.schema";
import { PrismaMapElementRepository } from "@/modules/map-elements/infrastructure/prisma-map-element.repository";
import { MapElementService } from "@/modules/map-elements/application/map-element.service";

const repository = new PrismaMapElementRepository();
const service = new MapElementService(repository);

const querySchema = paginationQuerySchema.extend({
  projectId: z.preprocess(
    (val) =>
      val === "undefined" || val === "" || val === "null" || !val
        ? undefined
        : val,
    z.string().uuid("ID do projeto inválido").optional(),
  ),
  companyId: z.preprocess(
    (val) =>
      val === "undefined" || val === "" || val === "null" || !val
        ? undefined
        : val,
    z.string().uuid("ID da empresa inválido").optional(),
  ),
  type: z.enum(["TOWER", "SPAN", "CABLE", "EQUIPMENT", "STATION"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const validation = Validator.validateQuery(
      querySchema,
      request.nextUrl.searchParams,
    );
    if (!validation.success) {
      const params = Object.fromEntries(request.nextUrl.searchParams.entries());
      logger.warn("Falha na validação de map_elements", { params });
      return validation.response;
    }

    const { projectId, companyId, type } = validation.data as any;
    const isSystemAdmin = isUserAdmin(user.role);

    logger.info(
      `GET /api/v1/map_elements: Session companyId=${user.companyId}, Requested companyId=${companyId}, projectId=${projectId}, Admin=${isSystemAdmin}`,
    );

    // If projectId is provided, just return elements for that project (admins can access any)
    if (projectId) {
      const elements = await service.getElements(projectId, type);
      return ApiResponse.json(elements);
    }

    // Security: For non-admins, require their own company
    const effectiveCompanyId = companyId || user.companyId;

    if (!isSystemAdmin && effectiveCompanyId !== user.companyId) {
      return ApiResponse.forbidden("Acesso negado a dados de outra empresa.");
    }

    // If companyId is available, filter by company
    if (effectiveCompanyId) {
      const elements = await service.getElementsByCompany(
        effectiveCompanyId,
        type,
      );
      logger.info(
        `GET /api/v1/map_elements: Found ${elements.length} elements for company ${effectiveCompanyId}`,
      );
      return ApiResponse.json(elements);
    }

    // System admins without companyId can get all elements (with limit)
    if (isSystemAdmin) {
      const elements = await service.getAllElements(type, 10000);
      logger.info(
        `GET /api/v1/map_elements: Admin fetched ${elements.length} elements globally`,
      );
      return ApiResponse.json(elements);
    }

    return ApiResponse.badRequest("projectId ou companyId é obrigatório");
  } catch (error) {
    logger.error("Erro ao listar elementos do mapa", { error });
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Import prisma for project lookup
    const { prisma } = await import("@/lib/prisma/client");

    // Inject companyId from logged user or from project if not provided
    const enrichElement = async (el: any) => {
      if (!el.companyId && !el.company_id) {
        // First try user's companyId
        if (user.companyId) {
          el.companyId = user.companyId;
        }
        // If user has no companyId (admin), lookup from project
        else if (el.projectId || el.project_id) {
          const projectId = el.projectId || el.project_id;
          const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { companyId: true },
          });
          if (project?.companyId) {
            el.companyId = project.companyId;
          }
        }
      }
      return el;
    };

    if (Array.isArray(body)) {
      const enrichedBody = await Promise.all(body.map(enrichElement));
      const results = await service.saveBatch(enrichedBody);
      return ApiResponse.json(
        results,
        `${results.length} elementos processados.`,
      );
    }

    const enrichedBody = await enrichElement(body);
    const result = await service.saveElement(enrichedBody);
    return ApiResponse.json(result, "Elemento processado com sucesso.");
  } catch (error) {
    logger.error("Erro ao salvar elemento(s) do mapa", { error });
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const id = request.nextUrl.searchParams.get("id");
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!isUserAdmin(user.role)) {
      return ApiResponse.forbidden(
        "Apenas administradores podem remover elementos.",
      );
    }

    if (id) {
      await service.deleteElement(id);
      return ApiResponse.json({ success: true }, "Elemento removido.");
    }

    if (projectId) {
      const count = await service.clearProject(projectId);
      return ApiResponse.json(
        { success: true, count },
        `${count} elementos removidos do projeto.`,
      );
    }

    return ApiResponse.badRequest("id ou projectId obrigatório.");
  } catch (error) {
    logger.error("Erro ao remover elemento(s) do mapa", { error });
    return handleApiError(error);
  }
}
