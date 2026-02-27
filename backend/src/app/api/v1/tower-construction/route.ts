import { NextRequest } from "next/server";
import { PrismaTowerConstructionRepository } from "@/modules/tower/infrastructure/prisma-tower-construction.repository";
import { PrismaTowerProductionRepository } from "@/modules/tower/infrastructure/prisma-tower-production.repository";
import { TowerConstructionService } from "@/modules/tower/application/tower-construction.service";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

import { z } from "zod";

const constructionRepo = new PrismaTowerConstructionRepository();
const productionRepo = new PrismaTowerProductionRepository();
const constructionService = new TowerConstructionService(
  constructionRepo,
  productionRepo,
);

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
  projectId: z.string().min(1, "projectId is required"),
  companyId: z.string().optional(),
  data: z.array(constructionItemSchema).min(1),
});

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("projectId is required2");
    }

    const data = await constructionService.getProjectData(projectId);
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

    // Usar o TowerConstructionService que já possui a lógica de sincronização com Produção
    const result = await constructionService.importProjectData(
      projectId,
      companyId,
      data as any, // Cast seguro para TowerImportItem[]
    );

    return ApiResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/route.ts#POST",
    );
  }
}
