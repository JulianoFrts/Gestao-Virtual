import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { AccessControlService } from "@/modules/user-roles/application/access-control.service";
import { PrismaAccessControlRepository } from "@/modules/user-roles/infrastructure/prisma-access-control.repository";
import { API } from "@/lib/constants";

// DI
const accessService = new AccessControlService(
  new PrismaAccessControlRepository(),
);

const createPermissionLevelSchema = z.object({
  name: z.string().min(1).max(100),
  rank: z.number().int().min(0).default(0),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional().default([]),
});

const querySchema = z.object({
  page: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().min(1).max(API.PAGINATION.MAX_LIMIT).default(API.PAGINATION.DEFAULT_PAGE_SIZE),
  ),
  name: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((filterName) => filterName || undefined),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      name: searchParams.get("name"),
    });

    const result = await accessService.listLevels(query as unknown);

    return ApiResponse.json(result);
  } catch (error) {

    return handleApiError(error, "src/app/api/v1/permission_levels/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();

    const body = await request.json();
    
    // Suporte para inserção em lote (Array) ou única (Objeto)
    const dataArray = Array.isArray(body) ? body : [body];
    const levels = [];

    for (const rawItem of dataArray) {
       const levelData = createPermissionLevelSchema.parse(rawItem);
       const level = await accessService.createLevel(levelData);
       logger.info("Nível de permissão criado", { levelId: level.id });
       levels.push(level);
    }

    // Se for apenas 1 (Objeto Original), retorna o primeiro
    if (!Array.isArray(body)) {
      return ApiResponse.json(levels[0], "Nível de permissão criado com sucesso");
    }

    return ApiResponse.json(levels, `${levels.length} níveis criados com sucesso`);
  } catch (error) {

    return handleApiError(error, "src/app/api/v1/permission_levels/route.ts#POST");
  }
}
