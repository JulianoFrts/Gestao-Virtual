import { logger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";

import { z } from "zod";

const syncMatrixSchema = z.object({
  levelId: z.string().min(1),
  matrix: z.array(z.object({
    moduleId: z.string().min(1),
    isGranted: z.boolean(),
  })),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const body = await request.json();

    const validation = syncMatrixSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { levelId, matrix } = validation.data;

    logger.debug(
      `[PermissionMatrixSync] Level: ${levelId}, Items: ${matrix.length}`,
    );

    // Usar transação para garantir atomicidade
    await prisma.$transaction(async (tx) => {
      for (const element of matrix) {
        await tx.permissionMatrix.upsert({
          where: {
            levelId_moduleId: {
              levelId: levelId,
              moduleId: element.moduleId,
            },
          },
          update: {
            isGranted: element.isGranted,
          },
          create: {
            levelId: levelId,
            moduleId: element.moduleId,
            isGranted: element.isGranted,
          },
        });
      }
    });

    return ApiResponse.json({
      success: true,
      message: "Permissões sincronizadas com sucesso.",
    });
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/permission_matrix/sync/route.ts#POST",
    );
  }
}
