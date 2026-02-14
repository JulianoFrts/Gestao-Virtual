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
  try {
    await requireAuth();
    const { id } = await params;

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
    return handleApiError(error);
  }
}
