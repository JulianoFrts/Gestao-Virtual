import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAuth();

    const task = await prisma.taskQueue.findUnique({
      where: { id },
    });

    if (!task) {
      return ApiResponse.notFound("Tarefa não encontrada");
    }

    return ApiResponse.json({
      id: task.id,
      status: task.status,
      error: task.error,
      updatedAt: task.updatedAt,
    });
  } catch (error) {
    console.error(`[API/TASK_QUEUE] Error fetching task ${id}:`, error);
    return handleApiError(error, "src/app/api/v1/task_queue/[id]/route.ts#GET");
  }
}
