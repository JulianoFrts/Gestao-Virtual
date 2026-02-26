import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/modules/common/domain/common.schema";
import { PrismaAssetRepository } from "@/modules/infrastructure-assets/infrastructure/prisma-asset.repository";
import { AssetService } from "@/modules/infrastructure-assets/application/asset.service";

// Injeção de Dependência
const repository = new PrismaAssetRepository();
const assetService = new AssetService(repository);

const querySchema = paginationQuerySchema.extend({
  projectId: z.preprocess(
    (schemaInput) => schemaInput === "undefined" || schemaInput === "" || schemaInput === "null" || !schemaInput
        ? undefined
        : schemaInput,
    z.string().min(1, "ID do projeto inválido").optional(),
  ),
  companyId: z.preprocess(
    (schemaInput) => schemaInput === "undefined" || schemaInput === "" || schemaInput === "null" || !schemaInput
        ? undefined
        : schemaInput,
    z.string().min(1, "ID da empresa inválido").optional(),
  ),
  type: z.enum(["TOWER", "SPAN", "CABLE", "EQUIPMENT", "STATION"]).optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());

    // Alias project_id -> projectId e company_id -> companyId para compatibilidade
    if (params.project_id && !params.projectId)
      params.projectId = params.project_id;
    if (params.company_id && !params.companyId)
      params.companyId = params.company_id;

    const validation = Validator.validate(querySchema, params);
    if (!validation.success) {
      logger.warn("Falha na validação de map_elements", { params });
      return validation.response;
    }

    const {  projectId, companyId, type  } = validation.data;
    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      user.role,
      user.hierarchyLevel,
      (user.permissions as Record<string, boolean>),
    );

    const effectiveCompanyId = companyId || user.companyId;

    if (!isGlobal && !effectiveCompanyId) {
      logger.warn("Tentativa de buscar ativos sem contexto de empresa", {
        userId: user.id,
      });
      return ApiResponse.badRequest(
        "Contexto de empresa obrigatório para seu nível de acesso.",
      );
    }

    if (!isGlobal && effectiveCompanyId !== user.companyId) {
      return ApiResponse.forbidden("Acesso negado a dados de outra empresa.");
    }

    // Busca unificada via AssetService
    const elements = await assetService.listAssets({
      projectId,
      companyId: effectiveCompanyId,
      elementType: type,
    });

    return ApiResponse.json(elements);
  } catch (error) {
    logger.error("Erro ao listar ativos de infraestrutura", { error });
    return handleApiError(error, "src/app/api/v1/map_elements/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const urlProjectId = params.projectId || params.project_id;

    if (!urlProjectId && !user.companyId) {
      return ApiResponse.badRequest(
        "Contexto de projeto ou empresa não identificado.",
      );
    }

    const count = await assetService.syncAssetsFromImport(
      user.companyId || "",
      urlProjectId || "",
      Array.isArray(body) ? body : [body],
    );

    return ApiResponse.json(
      { success: true, count },
      `${count} ativos processados com sucesso.`,
    );
  } catch (error: unknown) {
    logger.error("Erro ao salvar ativos", { message: error.message });
    return handleApiError(error, "src/app/api/v1/map_elements/route.ts#POST");
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth(request);
    const id = request.nextUrl.searchParams.get("id");

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    if (
      !isGlobalAdmin(
        user.role,
        user.hierarchyLevel,
        (user.permissions as Record<string, boolean>),
      )
    ) {
      return ApiResponse.forbidden("Acesso restrito.");
    }

    if (id) {
      await assetService.deleteAsset(id);
      return ApiResponse.json({ success: true }, "Ativo removido.");
    }

    return ApiResponse.badRequest("id obrigatório.");
  } catch (error) {
    logger.error("Erro ao remover ativo", { error });
    return handleApiError(error, "src/app/api/v1/map_elements/route.ts#DELETE");
  }
}
