import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface LoadingModule {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'completed' | 'failed';
}

interface InitContextType {
    isReady: boolean;
    progress: number;
    modules: LoadingModule[];
    setModuleStatus: (id: string, status: 'pending' | 'loading' | 'completed' | 'failed') => void;
    // Sync flags (merged from syncSignals)
    hasUsersFetched: boolean;
    setHasUsersFetched: (val: boolean) => void;
    hasTeamsFetched: boolean;
    setHasTeamsFetched: (val: boolean) => void;
    hasGlobalDataFetched: boolean;
    setHasGlobalDataFetched: (val: boolean) => void;
    has3dFetched: boolean;
    setHas3dFetched: (val: boolean) => void;
    hasReportsFetched: boolean;
    setHasReportsFetched: (val: boolean) => void;
    hasAuditFetched: boolean;
    setHasAuditFetched: (val: boolean) => void;
    hasCostsFetched: boolean;
    setHasCostsFetched: (val: boolean) => void;
    hasEmployeesFetched: boolean;
    setHasEmployeesFetched: (val: boolean) => void;
    hasTimeRecordsFetched: boolean;
    setHasTimeRecordsFetched: (val: boolean) => void;
    hasWorkStagesFetched: boolean;
    setHasWorkStagesFetched: (val: boolean) => void;
    hasSystemMessagesFetched: boolean;
    setHasSystemMessagesFetched: (val: boolean) => void;
}

const InitContext = createContext<InitContextType | undefined>(undefined);

export function InitProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoading: isAuthLoading } = useAuth();
    
    // Module flags
    const [hasUsersFetched, setHasUsersFetched] = useState(false);
    const [hasTeamsFetched, setHasTeamsFetched] = useState(false);
    const [hasGlobalDataFetched, setHasGlobalDataFetched] = useState(false);
    const [has3dFetched, setHas3dFetched] = useState(false);
    const [hasReportsFetched, setHasReportsFetched] = useState(false);
    const [hasAuditFetched, setHasAuditFetched] = useState(false);
    const [hasCostsFetched, setHasCostsFetched] = useState(false);
    const [hasEmployeesFetched, setHasEmployeesFetched] = useState(false);
    const [hasTimeRecordsFetched, setHasTimeRecordsFetched] = useState(false);
    const [hasWorkStagesFetched, setHasWorkStagesFetched] = useState(false);
    const [hasSystemMessagesFetched, setHasSystemMessagesFetched] = useState(false);

    // Active tasks tracking
    const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
    const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([]);

    // Simple delay for flicker prevention
    const [minDelayElapsed, setMinDelayElapsed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMinDelayElapsed(true), 200);
        return () => clearTimeout(timer);
    }, []);

    const setModuleStatus = (id: string, status: 'pending' | 'loading' | 'completed' | 'failed') => {
        if (status === 'loading') {
            setActiveTaskIds(prev => [...new Set([...prev, id])]);
            setPendingTaskIds(prev => prev.filter(pid => pid !== id));
        } else if (status === 'completed' || status === 'failed') {
            setActiveTaskIds(prev => prev.filter(aid => aid !== id));
            if (id === 'users') setHasUsersFetched(true);
            if (id === 'teams') setHasTeamsFetched(true);
            if (id === 'projects' || id === 'employees' || id === 'functions' || id === 'production') setHasGlobalDataFetched(true);
            if (id === 'reports') setHasReportsFetched(true);
            if (id === 'workStages') setHasWorkStagesFetched(true);
            if (id === 'timeRecords') setHasTimeRecordsFetched(true);
            if (id === 'audit') setHasAuditFetched(true);
            if (id === 'costs') setHasCostsFetched(true);
            if (id === 'viewer3d') setHas3dFetched(true);
            if (id === 'messages') setHasSystemMessagesFetched(true);
            if (id === 'employees') setHasEmployeesFetched(true);
        } else if (status === 'pending') {
            setPendingTaskIds(prev => [...new Set([...prev, id])]);
        }
    };

    const modules = useMemo((): LoadingModule[] => {
        const getStatus = (id: string, isFetched: boolean) => {
            if (isFetched) return 'completed';
            if (activeTaskIds.includes(id)) return 'loading';
            return 'pending';
        };

        return [
            { id: 'users', label: 'Usuários e Acessos', status: getStatus('users', hasUsersFetched) },
            { id: 'functions', label: 'Funções e Cargos', status: getStatus('functions', hasGlobalDataFetched) },
            { id: 'projects', label: 'Obras e Projetos', status: getStatus('projects', hasGlobalDataFetched) },
            { id: 'employees', label: 'Funcionários', status: getStatus('employees', hasGlobalDataFetched) },
            { id: 'teams', label: 'Equipes e Lideranças', status: getStatus('teams', hasTeamsFetched) },
            { id: 'reports', label: 'Relatórios Diários (RDO)', status: getStatus('reports', hasReportsFetched) },
            { id: 'workStages', label: 'Etapas de Obra', status: getStatus('workStages', hasWorkStagesFetched) },
            { id: 'production', label: 'Dados de Produção', status: getStatus('production', hasGlobalDataFetched) },
            { id: 'timeRecords', label: 'Ponto Eletrônico', status: getStatus('timeRecords', hasTimeRecordsFetched) },
            { id: 'costs', label: 'Gestão de Custos', status: getStatus('costs', hasCostsFetched) },
            { id: 'audit', label: 'Logs de Auditoria', status: getStatus('audit', hasAuditFetched) },
            { id: 'viewer3d', label: 'Engenharia 3D', status: getStatus('viewer3d', has3dFetched) },
        ];
    }, [hasUsersFetched, hasGlobalDataFetched, hasTeamsFetched, hasReportsFetched, hasWorkStagesFetched, hasTimeRecordsFetched, hasCostsFetched, hasAuditFetched, has3dFetched, activeTaskIds]);

    const progress = useMemo(() => {
        const completedCount = modules.filter(m => m.status === 'completed').length;
        return Math.round((completedCount / (modules.length || 1)) * 100);
    }, [modules]);

    const isReady = useMemo(() => {
        const authReady = !isAuthLoading;
        if (authReady && !user) return true;

        // Requirement for "Ready" (Optimistic)
        const ready = authReady && hasUsersFetched;
        return ready && minDelayElapsed;
    }, [isAuthLoading, user, hasUsersFetched, minDelayElapsed]);

    return (
        <InitContext.Provider
            value={{
                isReady,
                progress,
                modules,
                setModuleStatus,
                hasUsersFetched,
                setHasUsersFetched,
                hasTeamsFetched,
                setHasTeamsFetched,
                hasGlobalDataFetched,
                setHasGlobalDataFetched,
                has3dFetched,
                setHas3dFetched,
                hasReportsFetched,
                setHasReportsFetched,
                hasAuditFetched,
                setHasAuditFetched,
                hasCostsFetched,
                setHasCostsFetched,
                hasEmployeesFetched,
                setHasEmployeesFetched,
                hasTimeRecordsFetched,
                setHasTimeRecordsFetched,
                hasWorkStagesFetched,
                setHasWorkStagesFetched,
                hasSystemMessagesFetched,
                setHasSystemMessagesFetched,
            }}
        >
            {children}
        </InitContext.Provider>
    );
}

export function useInit() {
    const context = useContext(InitContext);
    if (context === undefined) {
        throw new Error('useInit must be used within an InitProvider');
    }
    return context;
}
