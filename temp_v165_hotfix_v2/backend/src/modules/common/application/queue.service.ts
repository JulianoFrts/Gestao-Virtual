import { ITaskRepository } from "../domain/task.repository";

export class QueueService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * Enfileira uma nova tarefa
   */
  async enqueue(type: string, payload: any) {
    return this.taskRepository.create(type, payload);
  }

  /**
   * Obtém o status de uma tarefa
   */
  async getJobStatus(jobId: string) {
    return this.taskRepository.findById(jobId);
  }

  /**
   * Lista tarefas recentes
   */
  async listRecentJobs(limit = 10) {
    return this.taskRepository.listRecent(limit);
  }

  /**
   * Cancela uma tarefa pendente
   */
  async cancelJob(jobId: string) {
    const job = await this.taskRepository.findById(jobId);

    if (!job) throw new Error("Job not found");
    if (job.status !== "pending")
      throw new Error("Only pending jobs can be cancelled");

    return this.taskRepository.updateStatus(
      jobId,
      "failed",
      "Cancelled by user",
    );
  }
}
