import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { QueueService } from "@/modules/common/application/queue.service";
import { PrismaTaskRepository } from "@/modules/common/infrastructure/prisma-task.repository";

const taskRepository = new PrismaTaskRepository();
const queueService = new QueueService(taskRepository);

/**
 * GET /api/v1/jobs
 * GET /api/v1/jobs?id=...
 *
 * Lista tarefas ou obtém status de uma específica
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (id) {
      const job = await queueService.getJobStatus(id);
      if (!job) {
        return ApiResponse.notFound("Tarefa não encontrada");
      }
      return ApiResponse.json(job);
    }

    const limit = parseInt(searchParams.get("limit") || "10");
    const jobs = await queueService.listRecentJobs(limit);
    return ApiResponse.json(jobs);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/jobs/route.ts#GET");
  }
}

/**
 * POST /api/v1/jobs
 *
 * Enfileira uma nova tarefa (Importação, Exportação, etc)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { type, payload } = body;

    if (!type) {
      return ApiResponse.validationError([
        "Tipo de tarefa (type) é obrigatório",
      ]);
    }

    // Segurança básica: Apenas Admin pode disparar certos tipos de jobs
    const adminOnlyJobs = ["system_maintenance", "global_export"];
    if (adminOnlyJobs.includes(type)) {
      await requireAdmin();
    }

    // Injetar metadados do solicitante no payload se for importação
    const refinedPayload = {
      ...payload,
      requestedBy: user.id,
      requestedAt: new Date().toISOString(),
    };

    const job = await queueService.enqueue(type, refinedPayload);

    return ApiResponse.created(job, "Tarefa enfileirada com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/jobs/route.ts#POST");
  }
}

/**
 * DELETE /api/v1/jobs?id=...
 *
 * Cancela uma tarefa pendente
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.validationError(["ID da tarefa é obrigatório"]);
    }

    const job = await queueService.cancelJob(id);
    return ApiResponse.json(job, "Tarefa cancelada");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/jobs/route.ts#DELETE");
  }
}
