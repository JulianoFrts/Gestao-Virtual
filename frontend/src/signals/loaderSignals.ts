import { signal } from "@preact/signals-react";

/**
 * loaderConcurrencySignal
 * Define o limite de tarefas simultâneas no ParallelLoader.
 * Pode ser ajustado dinamicamente via preferência do usuário ou UI.
 */
import { effect } from "@preact/signals-react";

const storedConcurrency = localStorage.getItem('loader_concurrency_v2');
const initialConcurrency = storedConcurrency ? parseInt(storedConcurrency, 10) : 0; // 0 = Infinite

export const loaderConcurrencySignal = signal<number>(initialConcurrency);

effect(() => {
    localStorage.setItem('loader_concurrency_v2', loaderConcurrencySignal.value.toString());
});

/**
 * activeTaskIdsSignal
 * Rastreia quais tarefas estão em execução no momento (status 'running').
 * Usado pela LoadingScreen para mostrar o spinner apenas nos itens ativos.
 */
export const activeTaskIdsSignal = signal<string[]>([]);

/**
 * pendingTaskIdsSignal
 * Rastreia quais tarefas estão na fila aguardando execução (status 'pending').
 */
export const pendingTaskIdsSignal = signal<string[]>([]);
