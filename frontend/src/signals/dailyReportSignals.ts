import { signal, effect } from "@preact/signals-react";
import { storageService } from "@/services/storageService";
import { ActivityStatus } from "@/hooks/useDailyReports";

export interface DailyReportPhoto {
    url?: string; // URL remota (GCP) ou string base64 legada
    uri?: string; // URL local temporária para preview no navegador
    file?: File;  // Arquivo pendente para upload (retido pelo IndexedDB)
    comment?: string;
}

export interface WeatherRecord {
    morning: 'GOOD' | 'RAIN' | 'IMPRACTICABLE';
    afternoon: 'GOOD' | 'RAIN' | 'IMPRACTICABLE';
    night: 'GOOD' | 'RAIN' | 'IMPRACTICABLE';
}

export interface ManpowerRecord {
    registration?: string;
    name: string;
    role: string;
    observations?: string;
}

export interface EquipmentRecord {
    equipment: string;
    type: string;
    model?: string;
    driverName?: string;
    plate?: string;
    observations?: string;
}

export interface DailyReportSubPointDetail {
    id: string; // Identificação (ex: Nome da Torre ou ID do Vão)
    status: ActivityStatus;
    progress: number; // Porcentagem de 0 a 100
    comment?: string; // Comentário individual opcional
    startTime?: string; // Horário inicial (HH:mm)
    endTime?: string; // Horário final (HH:mm)
    photos?: DailyReportPhoto[];
}

export interface DailyReportActivity {
    id: string; // Local ID for UI management
    stageId: string;
    stageName?: string;
    subPointType: 'GERAL' | 'TORRE' | 'VAO' | 'TRECHO' | 'ESTRUTURA';
    subPoint: string;
    subPointEnd?: string;
    isMultiSelection: boolean;
    observations: string;
    status: ActivityStatus;
    details: DailyReportSubPointDetail[];
    photos?: DailyReportPhoto[];
}

export interface DailyReportDraft {
    employeeId: string;
    teamIds: string[];
    selectedActivities: DailyReportActivity[];
    siteId?: string;
    projectId?: string;
    companyId?: string;
    weather?: WeatherRecord;
    manpower?: ManpowerRecord[];
    equipment?: EquipmentRecord[];
    generalObservations?: string;
    generalPhotos?: DailyReportPhoto[];
    rdoNumber?: string;
    revision?: string;
    projectDeadline?: number;
    step: number;
    updatedAt: number;
}

const DEFAULT_DRAFT: DailyReportDraft = {
    employeeId: '',
    teamIds: [],
    selectedActivities: [],
    siteId: '',
    projectId: '',
    companyId: '',
    weather: {
        morning: 'GOOD',
        afternoon: 'GOOD',
        night: 'GOOD'
    },
    manpower: [],
    equipment: [],
    generalObservations: '',
    generalPhotos: [],
    rdoNumber: '',
    revision: '0A',
    projectDeadline: undefined,
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
