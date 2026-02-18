export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface TaskConfig {
    id: string;
    label?: string;
    answer_label?: string;
    action: () => Promise<void>;
    dependencies?: string[];
    priority?: number; // Higher number = Higher priority
}

export class ParallelLoader {
    private tasks: TaskConfig[] = [];
    private activeCount = 0;
    private completedTasks = new Set<string>();
    private status: Record<string, TaskStatus> = {};

    private onProgressCb?: (completed: number, total: number, currentTask?: string) => void;
    private onCompleteCb?: () => void;
    private onErrorCb?: (error: any, taskId: string) => void;
    private onTaskStateChangeCb?: (taskId: string, status: TaskStatus) => void;

    private maxConcurrency: number | { value: number };

    constructor(concurrency: number | { value: number } = 100) {
        this.maxConcurrency = concurrency;
    }

    private get currentLimit(): number {
        const val = typeof this.maxConcurrency === 'number'
            ? this.maxConcurrency
            : this.maxConcurrency.value;
        
        // If value is 0 or less, treat as unlimited (max integer)
        return val <= 0 ? Number.MAX_SAFE_INTEGER : val;
    }

    /**
     * Adiciona uma tarefa à fila.
     */
    add(task: TaskConfig) {
        if (this.tasks.find(t => t.id === task.id)) {
            console.warn(`ParallelLoader: Duplicate task id '${task.id}' ignored.`);
            return;
        }
        this.tasks.push(task);
        this.status[task.id] = 'pending';
    }

    /**
     * Define o callback de progresso.
     */
    onProgress(cb: (completed: number, total: number, currentTask?: string) => void) {
        this.onProgressCb = cb;
    }

    /**
     * Define o callback de conclusão total.
     */
    onComplete(cb: () => void) {
        this.onCompleteCb = cb;
    }

    /**
     * Define o callback de mudança de estado de uma tarefa.
     */
    onTaskStateChange(cb: (taskId: string, status: TaskStatus) => void) {
        this.onTaskStateChangeCb = cb;
    }

    /**
     * Inicia o processamento da fila.
     */
    start() {
        // Notifica estados iniciais (todos pending)
        this.tasks.forEach(task => {
            this.onTaskStateChangeCb?.(task.id, 'pending');
        });
        this.processQueue();
    }

    private processQueue() {
        // Verifica se terminou tudo
        const total = this.tasks.length;
        const completed = this.completedTasks.size;

        if (completed === total) {
            this.onCompleteCb?.();
            return;
        }

        // Enquanto houver slots de workers livres...
        const limit = this.currentLimit;
        while (this.activeCount < limit) {
            // Encontrar próxima tarefa elegível
            // Elegível: Pending AND Todas dependências completas
            const eligibleTasks = this.tasks.filter(t => {
                if (this.status[t.id] !== 'pending') return false;
                const deps = t.dependencies || [];
                return deps.every(d => this.completedTasks.has(d));
            });

            if (eligibleTasks.length === 0) {
                // Nenhum trabalho pronto para ser pego agora (talvez esperando dependências ou tudo rodando)
                break;
            }

            // Ordenar por prioridade (maior primeiro)
            eligibleTasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            const task = eligibleTasks[0];
            this.runTask(task);
        }
    }

    private async runTask(task: TaskConfig) {
        this.activeCount++;
        this.status[task.id] = 'running';
        this.onTaskStateChangeCb?.(task.id, 'running');

        // Notificar início se quiser, por enquanto notifica progresso na conclusão

        try {
            await task.action();
            this.status[task.id] = 'completed';
            this.onTaskStateChangeCb?.(task.id, 'completed');
            this.completedTasks.add(task.id);
            this.onProgressCb?.(this.completedTasks.size, this.tasks.length, task.answer_label || task.label);
        } catch (e) {
            console.error(`ParallelLoader: Task '${task.id}' failed`, e);
            this.status[task.id] = 'failed';
            this.onTaskStateChangeCb?.(task.id, 'failed');
            this.onErrorCb?.(e, task.id);

            // Estratégia de falha: Por padrão, consideramos completado para não travar dependências?
            // Ou travamos? Para inicialização de UI, melhor não travar tudo se um módulo não essencial falhar.
            // Se for essencial, o app deve tratar via onError.
            // Marcamos como completedTasks para desbloquear a fila, mas com status failed.
            this.completedTasks.add(task.id);
            this.onProgressCb?.(this.completedTasks.size, this.tasks.length);
        } finally {
            this.activeCount--;
            this.processQueue();
        }
    }
}
