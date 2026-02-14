import { prisma } from "@/lib/prisma/client";
import { ITaskHandler } from "../domain/task-handler.interface";
import { logger } from "@/lib/utils/logger";

export class TaskWorker {
  private handlers: Map<string, ITaskHandler> = new Map();
  private isRunning = false;
  private readonly pollInterval = 5000; // 5 segundos

  /**
   * Registra um novo handler para um tipo específico de tarefa
   * Inversão de Dependência (Solid)
   */
  registerHandler(type: string, handler: ITaskHandler): this {
    this.handlers.set(type, handler);
    logger.info(`[Worker] Handler registrado para: ${type}`);
    return this;
  }

  /**
   * Inicia o loop de processamento
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info("🚀 Worker ORION: Iniciando orquestrador DDD...");
    logger.info(`[Worker] Prisma models available: ${Object.keys(prisma).filter(k => !k.startsWith('$')).join(', ')}`);

    while (this.isRunning) {
      try {
        // Tenta capturar uma tarefa atômica mudando de 'pending' para 'processing' em um único passo
        // Isso evita que dois Workers capturem a mesma tarefa simultaneamente
        const tasks = await prisma.$queryRaw`
          UPDATE "task_queue" 
          SET status = 'processing', "updated_at" = NOW()
          WHERE id = (
            SELECT id FROM "task_queue"
            WHERE status = 'pending'
            ORDER BY "created_at" ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          RETURNING *
        ` as any[];

        const task = tasks && tasks.length > 0 ? tasks[0] : null;

        if (!task) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.pollInterval),
          );
          continue;
        }

        await this.handleTaskWithStatus(task);
      } catch (error) {
        logger.error("Critical error in worker loop", { error });
        await new Promise((resolve) =>
          setTimeout(resolve, this.pollInterval * 2),
        );
      }
    }
  }

  /**
   * Para o worker graciosamente
   */
  stop(): void {
    this.isRunning = false;
    logger.info("[Worker] Parando orquestrador...");
  }

  private async handleTaskWithStatus(task: any): Promise<void> {
    const handler = this.handlers.get(task.type);

    if (!handler) {
      logger.warn(
        `[Worker] Nenhum handler registrado para o tipo: ${task.type}`,
      );
      await this.markAsFailed(
        task.id,
        `No handler found for type: ${task.type}`,
      );
      return;
    }

    try {
      logger.info(`[Worker] Executando ${task.type} (${task.id})...`);

      // Executa o handler
      await handler.handle(task.payload);

      // Marca como concluído
      const queue = (prisma as any).taskQueue || (prisma as any).task_queue;
      if (queue) {
        await queue.update({
          where: { id: task.id },
          data: { status: "completed", updatedAt: new Date() },
        });
      } else {
        await prisma.$executeRaw`UPDATE "task_queue" SET status = 'completed', "updated_at" = NOW() WHERE id = ${task.id}`;
      }

      logger.info(`✅ [Worker] Tarefa ${task.id} concluída.`);
    } catch (error: any) {
      logger.error(`❌ [Worker] Falha na tarefa ${task.id}`, {
        error: error.message,
      });
      await this.markAsFailed(task.id, error.message);
    }
  }

  private async markAsFailed(id: string, errorMessage: string): Promise<void> {
    try {
      const queue = (prisma as any).taskQueue || (prisma as any).task_queue;
      if (queue) {
        await queue.update({
          where: { id },
          data: {
            status: "failed",
            error: errorMessage,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.$executeRaw`UPDATE "task_queue" SET status = 'failed', error = ${errorMessage}, "updated_at" = NOW() WHERE id = ${id}`;
      }
    } catch (err) {
      console.error("Failed to update task status to failed", err);
    }
  }
}
