import React, { useEffect } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useTeams } from '@/hooks/useTeams';
import { fetchEmployees } from '@/signals/employeeSignals';
import { useSignals } from "@preact/signals-react/runtime";
import { hasUsersFetchedSignal, hasTeamsFetchedSignal, hasGlobalDataFetchedSignal } from '@/signals/syncSignals';

/**
 * GlobalInitializer
 * Responsável por disparar as cargas iniciais de dados críticos
 */
export const GlobalInitializer = () => {
    useSignals();
    
    const { refresh: refreshUsers } = useUsers();
    const { refresh: refreshTeams } = useTeams();

    const isLoading = React.useRef(false);

    useEffect(() => {
        // Prevenir reentrância
        if (isLoading.current) return;
        isLoading.current = true;

        // Carga inicial no mount
        const load = async () => {
            try {
                refreshUsers();
                refreshTeams();
                await fetchEmployees(true);
            } finally {
                isLoading.current = false;
            }
        };
        load();

        // SAFETY TIMEOUT: Se em 15 segundos não terminou de carregar, força a entrada
        // Isso evita que o usuário fique preso no Splash se o servidor falhar/demorar
        const timer = setTimeout(() => {
            if (!hasUsersFetchedSignal.value || !hasTeamsFetchedSignal.value) {
                console.warn("[GlobalInitializer] Initial sync taking too long, forcing entry...");
                hasUsersFetchedSignal.value = true;
                hasTeamsFetchedSignal.value = true;
                hasGlobalDataFetchedSignal.value = true;
            }
        }, 15000);

        return () => clearTimeout(timer);
    }, []); 

    return null;
};
