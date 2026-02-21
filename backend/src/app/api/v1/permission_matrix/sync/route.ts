import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const { levelId, matrix } = body;

    if (!levelId || !Array.isArray(matrix)) {
      return ApiResponse.badRequest("levelId e matriz são obrigatórios.");
    }

    // Usar transação para garantir atomicidade
    await prisma.$transaction(async (tx) => {
      for (const item of matrix) {
        await tx.permissionMatrix.upsert({
          where: {
            levelId_moduleId: {
              levelId: levelId,
              moduleId: item.moduleId,
            },
          },
          update: {
            isGranted: item.isGranted,
          },
          create: {
            levelId: levelId,
            moduleId: item.moduleId,
            isGranted: item.isGranted,
          },
        });
      }
    });

    return ApiResponse.json({ success: true, message: "Permissões sincronizadas com sucesso." });
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/permission_matrix/sync/route.ts#POST");
  }
}
