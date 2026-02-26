import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const tasks = await prisma.taskQueue.findMany({
      where: { type: "TOWER_IMPORT" },
      orderBy: { createdAt: "desc" },
      take: 10 /* literal */,
    });

    return ApiResponse.json({
      tasks,
    });
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/debug/tasks/route.ts#GET");
  }
}
