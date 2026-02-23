import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tasks = await prisma.taskQueue.findMany({
      where: { type: "TOWER_IMPORT" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return ApiResponse.json({
      tasks,
    });
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/debug/tasks/route.ts#GET");
  }
}
