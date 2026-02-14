import { signal, effect } from "@preact/signals-react";
import { storageService } from "@/services/storageService";

export interface DailyReportDraft {
    employeeId: string;
    subPointType: string;
    subPoint: string;
    subPointEnd?: string;
    isMultiSelection: boolean;
    teamIds: string[];
    selectedSpanIds: string[];
    selectedActivities: Array<{ stageId: string; status: 'IN_PROGRESS' | 'FINISHED' }>;
    activities: string;
    observations: string;
    siteId?: string;
    step: number;
    updatedAt: number;
}

const DEFAULT_DRAFT: DailyReportDraft = {
    employeeId: '',
    subPointType: 'GERAL',
    subPoint: '',
    subPointEnd: '',
    isMultiSelection: false,
    teamIds: [],
    selectedSpanIds: [],
    selectedActivities: [],
    activities: '',
    observations: '',
    siteId: '',
    step: 1,
    updatedAt: Date.now()
};

// Signal principal do rascunho
export const dailyReportDraftSignal = signal<DailyReportDraft>(DEFAULT_DRAFT);

// Função para atualizar o rascunho
export const updateReportDraft = (updates: Partial<DailyReportDraft>) => {
    dailyReportDraftSignal.value = {
        ...dailyReportDraftSignal.value,
        ...updates,
        updatedAt: Date.now()
    };
};

// Função para resetar o rascunho
export const resetReportDraft = () => {
    dailyReportDraftSignal.value = DEFAULT_DRAFT;
    storageService.removeItem('daily-report-draft');
};

// Recuperar rascunho inicial do storage
export const initReportDraft = async () => {
    const saved = await storageService.getItem<DailyReportDraft>('daily-report-draft');
    if (saved) {
        dailyReportDraftSignal.value = saved;
    }
};

// Efeito para persistência automática no IndexedDB
effect(() => {
    const data = dailyReportDraftSignal.value;
    if (data.updatedAt !== DEFAULT_DRAFT.updatedAt) {
        storageService.setItem('daily-report-draft', data);
    }
});
