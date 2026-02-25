import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from "@/services/storageService";
import { DailyReportActivity } from "./DailyReportContext";

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

interface RDOSchedulingContextType {
    draft: RDOSchedulingDraft;
    updateSchedulingDraft: (updates: Partial<RDOSchedulingDraft>) => void;
    resetSchedulingDraft: () => void;
}

const RDOSchedulingContext = createContext<RDOSchedulingContextType | undefined>(undefined);

export function RDOSchedulingProvider({ children }: { children: React.ReactNode }) {
    const [draft, setDraft] = useState<RDOSchedulingDraft>(DEFAULT_SCHEDULING_DRAFT);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial load from storage
    useEffect(() => {
        const loadDraft = async () => {
            const saved = await storageService.getItem<RDOSchedulingDraft>('rdo-scheduling-draft');
            if (saved) {
                setDraft(saved);
            }
            setIsInitialized(true);
        };
        loadDraft();
    }, []);

    // Persist to storage whenever draft changes
    useEffect(() => {
        if (!isInitialized) return;
        
        if (draft.updatedAt !== DEFAULT_SCHEDULING_DRAFT.updatedAt) {
            storageService.setItem('rdo-scheduling-draft', draft);
        }
    }, [draft, isInitialized]);

    const updateSchedulingDraft = useCallback((updates: Partial<RDOSchedulingDraft>) => {
        setDraft(prev => ({
            ...prev,
            ...updates,
            updatedAt: Date.now()
        }));
    }, []);

    const resetSchedulingDraft = useCallback(() => {
        setDraft(DEFAULT_SCHEDULING_DRAFT);
        storageService.removeItem('rdo-scheduling-draft');
    }, []);

    return (
        <RDOSchedulingContext.Provider
            value={{
                draft,
                updateSchedulingDraft,
                resetSchedulingDraft
            }}
        >
            {children}
        </RDOSchedulingContext.Provider>
    );
}

export function useRDOScheduling() {
    const context = useContext(RDOSchedulingContext);
    if (context === undefined) {
        throw new Error('useRDOScheduling must be used within a RDOSchedulingProvider');
    }
    return context;
}
