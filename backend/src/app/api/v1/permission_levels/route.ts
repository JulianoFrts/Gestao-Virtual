import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { AccessControlService } from "@/modules/user-roles/application/access-control.service";
import { PrismaAccessControlRepository } from "@/modules/user-roles/infrastructure/prisma-access-control.repository";

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
    z.coerce.number().min(1).max(100).default(100),
  ),
  name: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      name: searchParams.get("name"),
    });

    const result = await accessService.listLevels(query as any);

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/permission_levels/route.ts#GET",
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const data = createPermissionLevelSchema.parse(body);

    const level = await accessService.createLevel(data);

    logger.info("Nível de permissão criado", { levelId: level.id });

    return ApiResponse.json(level, "Nível de permissão criado com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/permission_levels/route.ts#POST",
    );
  }
}
