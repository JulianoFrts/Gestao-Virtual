import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { QueueService } from "@/modules/common/application/queue.service";
import { PrismaTaskRepository } from "@/modules/common/infrastructure/prisma-task.repository";

const taskRepository = new PrismaTaskRepository();
const queueService = new QueueService(taskRepository);

/**
 * GET /api/v1/jobs/[id]
 *
 * Obtém status de uma tarefa específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAuth();

    const { id } = await params;

    const job = await queueService.getJobStatus(id);
    if (!job) {
      return ApiResponse.notFound("Tarefa não encontrada");
    }

    return ApiResponse.json(job);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/jobs/[id]/route.ts#GET");
  }
}

/**
 * DELETE /api/v1/jobs/[id]
 *
 * Cancela uma tarefa pendente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAuth();

    const { id } = await params;

    const job = await queueService.cancelJob(id);

    return ApiResponse.json(job, "Tarefa cancelada");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/jobs/[id]/route.ts#DELETE");
  }
}
