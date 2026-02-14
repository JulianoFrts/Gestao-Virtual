import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { TemporaryPermissionService } from "@/modules/temporary-permissions/application/temporary-permission.service";
import { PrismaTemporaryPermissionRepository } from "@/modules/temporary-permissions/infrastructure/prisma-temporary-permission.repository";

// DI
const permissionService = new TemporaryPermissionService(
  new PrismaTemporaryPermissionRepository(),
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateTemporaryPermissionSchema = z.object({
  permissionType: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  usedAt: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAuth();

    const permission = await permissionService.getPermissionById(id);

    if (!permission) {
      return ApiResponse.notFound("Permissão temporária não encontrada");
    }

    return ApiResponse.json(permission);
  } catch (error) {
    logger.error("Erro ao buscar permissão temporária", {
      permissionId: id,
      error,
    });
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAdmin();

    const body = await request.json();
    const data = updateTemporaryPermissionSchema.parse(body);

    const existingPermission = await permissionService.getPermissionById(id);

    if (!existingPermission) {
      return ApiResponse.notFound("Permissão temporária não encontrada");
    }

    const permission = await permissionService.updatePermission(id, data);

    logger.info("Permissão temporária atualizada", {
      permissionId: permission.id,
    });

    return ApiResponse.json(
      permission,
      "Permissão temporária atualizada com sucesso",
    );
  } catch (error) {
    logger.error("Erro ao atualizar permissão temporária", {
      permissionId: id,
      error,
    });
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  return PUT(request, context);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAdmin();

    const existingPermission = await permissionService.getPermissionById(id);

    if (!existingPermission) {
      return ApiResponse.notFound("Permissão temporária não encontrada");
    }

    await permissionService.deletePermission(id);

    logger.info("Permissão temporária removida", { permissionId: id });

    return ApiResponse.noContent();
  } catch (error) {
    logger.error("Erro ao remover permissão temporária", {
      permissionId: id,
      error,
    });
    return handleApiError(error);
  }
}
