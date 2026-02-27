import { NextRequest } from "next/server";
import { PrismaAssetRepository } from "@/modules/infrastructure-assets/infrastructure/prisma-asset.repository";
import { AssetService } from "@/modules/infrastructure-assets/application/asset.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { logger } from "@/lib/utils/logger";

import { z } from "zod";

const repository = new PrismaAssetRepository();
const assetService = new AssetService(repository);

const constructionItemSchema = z.object({
  towerId: z.string().optional(),
  id: z.string().optional(),
  sequencia: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  elevacao: z.number().optional(),
  vao: z.number().optional(),
  zona: z.union([z.string(), z.number()]).optional(),
  pesoEstrutura: z.number().optional(),
  pesoConcreto: z.number().optional(),
  pesoEscavacao: z.number().optional(),
  aco1: z.number().optional(),
  aco2: z.number().optional(),
  aco3: z.number().optional(),
  status: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

const provisionConstructionSchema = z.object({
  projectId: z.string().min(1),
  companyId: z.string().optional(),
  data: z.array(constructionItemSchema).min(1),
});

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId is required");
    }

    const data = await assetService.getConstructionData(projectId);
    return ApiResponse.json(data);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#GET",
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const validation = provisionConstructionSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(
        validation.error.issues.map((i) => i.message),
      );
    }

    const { projectId, data } = validation.data;
    const companyId = validation.data.companyId || user.companyId;

    if (!companyId) {
      return ApiResponse.badRequest("companyId is required");
    }

    // Mapear dados com metadata completa para persistência
    const items = data
      .filter((t) => !!(t.towerId || t.id))
      .map((t) => ({
        towerId: (t.towerId || t.id) as string,
        sequencia: t.sequencia || 0,
        metadata: {
          latitude: t.lat || 0,
          longitude: t.lng || 0,
          elevacao: t.elevacao || 0,
          distancia_vao: t.vao || 0,
          zona: String(t.zona || ""),
          peso_estrutura: t.pesoEstrutura || 0,
          peso_concreto: t.pesoConcreto || 0,
          peso_escavacao: t.pesoEscavacao || 0,
          aco1: t.aco1 || 0,
          aco2: t.aco2 || 0,
          aco3: t.aco3 || 0,
        },
      }));

    const result = await assetService.provisionConstructionWithData(
      projectId,
      companyId,
      items,
    );

    return ApiResponse.json({ count: result });
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#POST",
    );
  }
}
