import { signal, computed } from "@preact/signals-react";
import { isAuthLoadingSignal } from "./authSignals";
import { 
    isLoadingDataSignal, 
    isSyncingInitialDataSignal,
    isUsersLoadingSignal,
    hasUsersFetchedSignal,
    isTeamsLoadingSignal,
    hasTeamsFetchedSignal,
    hasGlobalDataFetchedSignal
} from "./syncSignals";

/**
 * appInitSignals - Orquestra o estado real de carregamento do sistema.
 * 
 * Este arquivo centraliza o progresso da LoadingScreen com base nos signals
 * de outros módulos e um delay mínimo de segurança para animações "wow".
 */

// Signal para forçar um delay mínimo (prevenção de "flicker" rápido demais)
const minDelayElapsedSignal = signal<boolean>(false);

// Inicia o timer de delay mínimo ao carregar o módulo
const MIN_INIT_TIME = 800; // ms
if (typeof window !== 'undefined') {
    setTimeout(() => {
        if (!minDelayElapsedSignal.value) {
            console.log("[AppInit] Animations delay elapsed.");
            minDelayElapsedSignal.value = true;
        }
    }, MIN_INIT_TIME);
    
    // Safety fallback: if everything else is ready, don't wait forever for the timer
}

/**
 * Representa os passos individuais de carregamento baseados em dados reais.
 */
export const loadingModulesSignal = computed(() => {
    const authLoading = isAuthLoadingSignal.value;
    const dataLoading = isLoadingDataSignal.value;
    const syncingInitial = isSyncingInitialDataSignal.value;
    const minDelay = minDelayElapsedSignal.value;

    const usersLoading = isUsersLoadingSignal.value;
    const usersFetched = hasUsersFetchedSignal.value;
    const teamsLoading = isTeamsLoadingSignal.value;
    const teamsFetched = hasTeamsFetchedSignal.value;
    const globalFetched = hasGlobalDataFetchedSignal.value;

    return [
        { id: 'users', label: 'Usuários e Acessos', status: usersFetched ? 'completed' : (authLoading || usersLoading) ? 'loading' : 'pending' },
        { id: 'projects', label: 'Obras e Projetos', status: globalFetched ? 'completed' : dataLoading ? 'loading' : 'pending' },
        { id: 'employees', label: 'Funcionários', status: globalFetched ? 'completed' : dataLoading ? 'loading' : 'pending' },
        { id: 'teams', label: 'Equipes e Lideranças', status: teamsFetched ? 'completed' : teamsLoading ? 'loading' : 'pending' },
        { id: 'sites', label: 'Canteiros de Obra', status: globalFetched ? 'completed' : dataLoading ? 'loading' : 'pending' },
        { id: 'production', label: 'Dados de Produção', status: globalFetched ? 'completed' : dataLoading ? 'loading' : 'pending' },
        { id: 'viewer3d', label: 'Engenharia 3D', status: minDelay ? 'completed' : 'loading' },
        { id: 'reports', label: 'Relatórios e Médias', status: minDelay ? 'completed' : 'loading' },
    ];
});

/**
 * Progresso total calculado (0-100)
 */
export const appProgressSignal = computed(() => {
    const modules = loadingModulesSignal.value;
    const completedCount = modules.filter(m => m.status === 'completed').length;
    return Math.round((completedCount / modules.length) * 100);
});

/**
 * Estado final de prontidão
 */
export const isAppReadySignal = computed(() => {
    const authReady = !isAuthLoadingSignal.value;
    const dataReady = !isLoadingDataSignal.value;
    const syncReady = !isSyncingInitialDataSignal.value;
    
    // O timer de delay agora é apenas para o "wow factor" visual
    // Não bloqueamos a entrada no sistema se os dados já estiverem prontos
    const ready = authReady && dataReady && syncReady;
    
    if (ready) {
        console.log("[AppInit] System data is ready.");
        // Se já estamos prontos, forçamos o delay visual a terminar também
        if (!minDelayElapsedSignal.value) minDelayElapsedSignal.value = true;
    }
    
    return ready;
});
