import { signal, computed } from "@preact/signals-react";
import { isAuthLoadingSignal, currentUserSignal } from "./authSignals";
import {
    isLoadingDataSignal,
    isSyncingInitialDataSignal,
    isUsersLoadingSignal,
    hasUsersFetchedSignal,
    isTeamsLoadingSignal,
    hasTeamsFetchedSignal,
    hasGlobalDataFetchedSignal,
    has3dFetchedSignal,
    hasReportsFetchedSignal,
    hasAuditFetchedSignal,
    hasCostsFetchedSignal
} from "./syncSignals";
import { hasSystemMessagesFetchedSignal } from "./monitoringSignals";
import { hasTimeRecordsFetchedSignal } from "./timeSignals";
import { hasWorkStagesFetchedSignal } from "./workStageSignals";
import { activeTaskIdsSignal, pendingTaskIdsSignal } from "./loaderSignals";

/**
 * appInitSignals - Orquestra o estado real de carregamento do sistema.
 */

// Signal para forçar um delay mínimo (prevenção de "flicker" rápido demais)
const minDelayElapsedSignal = signal<boolean>(false);

// Inicia o timer de delay mínimo ao carregar o módulo
const MIN_INIT_TIME = 200; // ms
if (typeof window !== 'undefined') {
    setTimeout(() => {
        if (!minDelayElapsedSignal.value) {
            minDelayElapsedSignal.value = true;
        }
    }, MIN_INIT_TIME);
}

/**
 * Representa os passos individuais de carregamento baseados em dados reais.
 */
export const loadingModulesSignal = computed(() => {
    const authFetched = !isAuthLoadingSignal.value;
    const usersFetched = hasUsersFetchedSignal.value;
    const teamsFetched = hasTeamsFetchedSignal.value;
    const globalFetched = hasGlobalDataFetchedSignal.value;
    const fetched3d = has3dFetchedSignal.value;
    const fetchedReports = hasReportsFetchedSignal.value;
    const fetchedMessages = hasSystemMessagesFetchedSignal.value;
    const fetchedTime = hasTimeRecordsFetchedSignal.value;
    const fetchedStages = hasWorkStagesFetchedSignal.value;
    const fetchedAudit = hasAuditFetchedSignal.value;
    const fetchedCosts = hasCostsFetchedSignal.value;

    const activeIds = activeTaskIdsSignal.value;
    const pendingIds = pendingTaskIdsSignal.value;

    const getStatus = (id: string, isFetched: boolean) => {
        if (isFetched) return 'completed';
        if (activeIds.includes(id)) return 'loading';
        if (pendingIds.includes(id)) return 'pending';
        return 'pending'; // Padrão se não estiver em nenhum (logo será adicionado)
    };

    return [
        { id: 'users', label: 'Usuários e Acessos', status: getStatus('users', usersFetched) },
        { id: 'functions', label: 'Funções e Cargos', status: getStatus('functions', globalFetched) },
        { id: 'projects', label: 'Obras e Projetos', status: getStatus('projects', globalFetched) },
        { id: 'employees', label: 'Funcionários', status: getStatus('employees', globalFetched) },
        { id: 'teams', label: 'Equipes e Lideranças', status: getStatus('teams', teamsFetched) },
        { id: 'reports', label: 'Relatórios Diários (RDO)', status: getStatus('reports', fetchedReports) },
        { id: 'workStages', label: 'Etapas de Obra', status: getStatus('workStages', fetchedStages) },
        { id: 'production', label: 'Dados de Produção', status: getStatus('production', globalFetched) },
        { id: 'timeRecords', label: 'Ponto Eletrônico', status: getStatus('timeRecords', fetchedTime) },
        { id: 'costs', label: 'Gestão de Custos', status: getStatus('costs', fetchedCosts) },
        { id: 'audit', label: 'Logs de Auditoria', status: getStatus('audit', fetchedAudit) },
        { id: 'viewer3d', label: 'Engenharia 3D', status: getStatus('viewer3d', fetched3d) },
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
    const user = currentUserSignal.value;

    // Se a autenticação terminou e não há usuário, o app está pronto para roteamento (ex: p/ tela de login)
    // Isso evita o travamento em 0% quando a sessão expira ou não existe.
    if (authReady && !user) return true;

    const usersReady = hasUsersFetchedSignal.value;
    const teamsReady = hasTeamsFetchedSignal.value;
    const globalReady = hasGlobalDataFetchedSignal.value;
    const dim3Ready = has3dFetchedSignal.value;
    const reportsReady = hasReportsFetchedSignal.value;
    const messagesReady = hasSystemMessagesFetchedSignal.value;
    const timeReady = hasTimeRecordsFetchedSignal.value;
    const stagesReady = hasWorkStagesFetchedSignal.value;
    const auditReady = hasAuditFetchedSignal.value;
    const costsReady = hasCostsFetchedSignal.value;

    // Critérios mínimos para entrada (Otimista)
    // Agora só bloqueamos se o usuário e dados básicos de acesso não estiverem prontos.
    // Outros dados (equipes, etapas, etc.) carregam em background.
    const ready = authReady && usersReady;

    if (ready && !minDelayElapsedSignal.value) {
        minDelayElapsedSignal.value = true;
    }

    return ready;
});

