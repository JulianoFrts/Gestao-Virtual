/**
 * Interface para manipuladores de tarefas em segundo plano (Worker)
 * Segue o princípio de Segregação de Interface (Solid)
 */
export interface ITaskHandler {
  handle(payload: unknown): Promise<void>;
}
