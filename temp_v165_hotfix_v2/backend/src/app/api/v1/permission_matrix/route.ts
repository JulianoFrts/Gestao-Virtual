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

export async function GET() {
  try {
    await requireAuth();

    const matrix = await accessService.listMatrix();

    return ApiResponse.json(matrix);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/permission_matrix/route.ts#GET",
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const updates = Array.isArray(body) ? body : [];

    const result = await accessService.queueMatrixUpdate(updates);

    logger.info("Permission Matrix update queued", {
      adminId: admin.id,
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
