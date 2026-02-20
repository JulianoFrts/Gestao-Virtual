import { signal, effect } from "@preact/signals-react";
import { storageService } from "@/services/storageService";
import { DailyReportActivity } from "./dailyReportSignals";

export interface RDOSchedulingDraft {
    employeeId: string;
    teamIds: string[];
    selectedActivities: DailyReportActivity[];
    siteId?: string;
    reportDate: string; // ISO string para data de programação
    status: 'PROGRAMMED';
    step: number;
    updatedAt: number;
}

const DEFAULT_SCHEDULING_DRAFT: RDOSchedulingDraft = {
    employeeId: '',
    teamIds: [],
    selectedActivities: [],
    siteId: '',
    reportDate: new Date().toISOString().split('T')[0],
    status: 'PROGRAMMED',
    step: 1,
    updatedAt: Date.now()
};

export const rdoSchedulingDraftSignal = signal<RDOSchedulingDraft>(DEFAULT_SCHEDULING_DRAFT);

export const updateSchedulingDraft = (updates: Partial<RDOSchedulingDraft>) => {
    rdoSchedulingDraftSignal.value = {
        ...rdoSchedulingDraftSignal.value,
        ...updates,
        updatedAt: Date.now()
    };
};

export const resetSchedulingDraft = () => {
    rdoSchedulingDraftSignal.value = DEFAULT_SCHEDULING_DRAFT;
    storageService.removeItem('rdo-scheduling-draft');
};

export const initSchedulingDraft = async () => {
    const saved = await storageService.getItem<RDOSchedulingDraft>('rdo-scheduling-draft');
    if (saved) {
        rdoSchedulingDraftSignal.value = saved;
    }
};

effect(() => {
    const data = rdoSchedulingDraftSignal.value;
    if (data.updatedAt !== DEFAULT_SCHEDULING_DRAFT.updatedAt) {
        storageService.setItem('rdo-scheduling-draft', data);
    }
});
