/**
 * TemporaryPermission API - GESTÃO VIRTUAL Backend
 *
 * Endpoint: /api/v1/TemporaryPermission
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { TemporaryPermissionService } from "@/modules/temporary-permissions/application/temporary-permission.service";
import { PrismaTemporaryPermissionRepository } from "@/modules/temporary-permissions/infrastructure/prisma-temporary-permission.repository";

// Inicialização do Service (Dependency Injection)
const repository = new PrismaTemporaryPermissionRepository();
const service = new TemporaryPermissionService(repository);

const createTemporaryPermissionSchema = z.object({
  userId: z.string(),
  permissionType: z.string().min(1),
  grantedBy: z.string().optional(),
  ticketId: z.string().uuid().optional(),
  expiresAt: z.string().datetime(),
});

const updateTemporaryPermissionSchema = z.object({
  permissionType: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  usedAt: z.string().datetime().optional().nullable(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  permissionType: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  active: z
    .enum(["true", "false"])
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
      userId: searchParams.get("userId"),
      permissionType: searchParams.get("permissionType"),
      active: searchParams.get("active"),
    });

    const result = await service.listPermissions(query);

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/temporary_permissions/route.ts#GET",
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const data = createTemporaryPermissionSchema.parse(body);

    const permission = await service.createPermission(data);

    logger.info("Permissão temporária criada", { permissionId: permission.id });

    return ApiResponse.created(
      permission,
      "Permissão temporária criada com sucesso",
    );
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/temporary_permissions/route.ts#POST",
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();

    // Support both single update and bulk update
    if (body.id) {
      // Single update
      const data = updateTemporaryPermissionSchema.parse(body);
      const permission = await service.updatePermission(body.id, data);

      return ApiResponse.json(permission, "Permissão temporária atualizada");
    }

    // Bulk mark as used (for cleanup)
    if (body.markExpiredAsUsed) {
      const result = await service.cleanupExpiredPermissions();
      return ApiResponse.json(
        { updated: result.count },
        "Permissões expiradas marcadas como usadas",
      );
    }

    return ApiResponse.badRequest("ID ou operação não especificada");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/temporary_permissions/route.ts#PATCH",
    );
  }
}
