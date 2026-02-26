import { prisma } from "@/lib/prisma/client";
import { TaskStatus, Prisma, TaskQueue } from "@prisma/client";
import { ITaskHandler } from "../domain/task-handler.interface";

export class TaskWorker {
  private handlers: Map<string, ITaskHandler> = new Map();
  private isRunning = false;
  private readonly pollInterval = 1500; // 1.5 segundos para maior responsividade

  /**
   * Registra um novo handler para um tipo específico de tarefa
   * Inversão de Dependência (Solid)
   */
  registerHandler(type: string, handler: ITaskHandler): this {
    this.handlers.set(type, handler);
    return this;
  }

  /**
   * Inicia o loop de processamento
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Tenta capturar uma tarefa atômica mudando de 'pending' para 'processing' em um único passo
        // Isso evita que dois Workers capturem a mesma tarefa simultaneamente
        // O uso de Prisma.sql garante a parametrização segura da query
        const tasks = (await prisma.$queryRaw<TaskQueue[]>(
          Prisma.sql`
            UPDATE "task_queue" 
            SET status = ${TaskStatus.processing}::"TaskStatus", "updated_at" = NOW()
            WHERE id = (
              SELECT id FROM "task_queue"
              WHERE status = ${TaskStatus.pending}::"TaskStatus"
              ORDER BY "created_at" ASC
              LIMIT 1
              FOR UPDATE SKIP LOCKED
            )
            RETURNING *
          `
        ));

        const task = tasks && tasks.length > 0 ? tasks[0] : null;

        if (!task) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.pollInterval),
          );
          continue;
        }

        await this.handleTaskWithStatus(task);
      } catch (error) {
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
  }

  private async handleTaskWithStatus(task: TaskQueue): Promise<void> {
    const handler = this.handlers.get(task.type);

    if (!handler) {
      await this.markAsFailed(
        task.id,
        `No handler found for type: ${task.type}`,
      );
      return;
    }

    try {
      // Executa o handler
      await handler.handle(task.payload as Record<string, unknown>);

      // Marca como concluído
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: { status: TaskStatus.completed, updatedAt: this.timeProvider ? this.timeProvider.now() : this.timeProvider.now() },
      });
    } catch (error: unknown) {
      const err = error as Error;
      await this.markAsFailed(task.id, err.message);
    }
  }

  private async markAsFailed(id: string, errorMessage: string): Promise<void> {
    try {
      await prisma.taskQueue.update({
        where: { id },
        data: {
          status: TaskStatus.failed,
          error: errorMessage,
          updatedAt: this.timeProvider ? this.timeProvider.now() : this.timeProvider.now(),
        },
      });
    } catch (err) {
      // Silencioso
    }
  }
}
