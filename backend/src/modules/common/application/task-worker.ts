import { prisma } from "@/lib/prisma/client";
import { TaskStatus } from "@prisma/client";
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
        const tasks = (await prisma.$queryRaw`
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
        `) as any[];

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

  private async handleTaskWithStatus(task: any): Promise<void> {
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
      await handler.handle(task.payload);

      // Marca como concluído
      const queue = (prisma as any).taskQueue || (prisma as any).task_queue;
      if (queue) {
        await queue.update({
          where: { id: task.id },
          data: { status: TaskStatus.completed, updatedAt: new Date() },
        });
      } else {
        await prisma.$executeRaw`UPDATE "task_queue" SET status = ${TaskStatus.completed}::"TaskStatus", "updated_at" = NOW() WHERE id = ${task.id}`;
      }
    } catch (error: any) {
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
            status: TaskStatus.failed,
            error: errorMessage,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.$executeRaw`UPDATE "task_queue" SET status = ${TaskStatus.failed}::"TaskStatus", error = ${errorMessage}, "updated_at" = NOW() WHERE id = ${id}`;
      }
    } catch (err) {
      // Silencioso
    }
  }
}
