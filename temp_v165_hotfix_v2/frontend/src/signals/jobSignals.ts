import { signal } from "@preact/signals-react";
import { toast } from "@/hooks/use-toast";
import { db } from "@/integrations/database";

export interface JobState {
  id: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  error?: string;
  payload?: any;
  updatedAt: string;
}

// Sinais Globais
export const activeJobs = signal<Record<string, JobState>>({});
export const isAnyJobProcessing = signal(false);

/**
 * Adiciona ou atualiza um job no estado global
 */
export const updateJobState = (jobId: string, state: Partial<JobState>) => {
  const currentJobs = { ...activeJobs.value };
  if (!currentJobs[jobId] && !state.type) return; // Não cria se não tiver os dados básicos

  currentJobs[jobId] = {
    ...(currentJobs[jobId] || {}),
    ...state,
    id: jobId,
  } as JobState;

  activeJobs.value = currentJobs;
  isAnyJobProcessing.value = Object.values(currentJobs).some(
    (j) => j.status === "processing" || j.status === "pending",
  );
};

/**
 * Remove um job do estado global
 */
export const removeJob = (jobId: string) => {
  const currentJobs = { ...activeJobs.value };
  delete currentJobs[jobId];
  activeJobs.value = currentJobs;
  isAnyJobProcessing.value = Object.values(currentJobs).some(
    (j) => j.status === "processing" || j.status === "pending",
  );
};

/**
 * Monitora um job específico via polling e atualiza os sinais
 */
export const monitorJob = async (jobId: string) => {
  const checkStatus = async () => {
    try {
      const { data: job, error } = await db
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("[Signals] Error fetching job status:", error);
        return false;
      }

      if (!job) return false;
      updateJobState(jobId, job);

      if (job.status === "completed") {
        const results = job.payload?.results;
        toast({
          title: "Processamento concluído",
          description: `Tarefa ${job.type} finalizada com sucesso.`,
        });

        // Remove do monitor após 5 segundos
        setTimeout(() => removeJob(jobId), 5000);
        return true;
      }

      if (job.status === "failed") {
        toast({
          title: "Falha no processamento",
          description: job.error || "Ocorreu um erro na tarefa.",
          variant: "destructive",
        });

        // Mantém um pouco mais para o usuário ver o erro
        setTimeout(() => removeJob(jobId), 10000);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Job monitoring error:", error);
      return false;
    }
  };

  // Executa a primeira checagem imediatamente
  const finished = await checkStatus();
  if (finished) return;

  // Inicia o polling
  const interval = setInterval(async () => {
    const isDone = await checkStatus();
    if (isDone) clearInterval(interval);
  }, 3000);
};
