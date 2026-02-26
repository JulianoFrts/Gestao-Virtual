import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const confirm = searchParams.get("confirm");

    if (confirm !== "yes") {
      return ApiResponse.badRequest(
        "Para confirmar a exclusão passe ?confirm=yes na URL.",
      );
    }

    await prisma.$transaction([
      prisma.towerProduction.deleteMany({}),
      prisma.towerConstruction.deleteMany({}),
      prisma.towerActivityGoal.deleteMany({}),
      prisma.mapElementTechnicalData.deleteMany({
        where: { elementType: "TOWER" },
      }),
      prisma.taskQueue.deleteMany({ where: { type: "TOWER_IMPORT" } }),
    ]);

    return ApiResponse.json({
      message:
        "Tabelas tower_production, tower_construction, tower_activity_goals, map_element_technical_data e task_queue limpas com sucesso. O banco está pronto para recomeçar.",
    });
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/debug/clean/route.ts#GET");
  }
}
