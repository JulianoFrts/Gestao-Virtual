import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin, requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { AccessControlService } from "@/modules/user-roles/application/access-control.service";
import { PrismaAccessControlRepository } from "@/modules/user-roles/infrastructure/prisma-access-control.repository";

// DI
const accessService = new AccessControlService(
  new PrismaAccessControlRepository(),
);

import { z } from "zod";

const permissionUpdateSchema = z.object({
  levelId: z.string().min(1),
  moduleId: z.string().min(1),
  canView: z.boolean().optional(),
  canCreate: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  canManage: z.boolean().optional(),
});

const permissionUpdatesSchema = z.array(permissionUpdateSchema);

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const levelId = searchParams.get("levelId") || undefined;

    const matrix = await accessService.listMatrix(levelId);

    return ApiResponse.json(matrix);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/permission_matrix/route.ts#GET",
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAdmin();
    const body = await request.json();

    const validation = permissionUpdatesSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const updates = validation.data;

    const result = await accessService.queueMatrixUpdate(updates);

    logger.info("Permission Matrix update queued", {
      adminId: user.id,
      itemCount: updates.length,
    });

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/permission_matrix/route.ts#POST",
    );
  }
}
