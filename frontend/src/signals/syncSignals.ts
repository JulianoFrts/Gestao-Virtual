import { signal, computed } from "@preact/signals-react";
import { currentUserSignal } from "./authSignals";

/**
 * syncSignals - Signals para rastrear o progresso de sincronização e inicialização.
 * Movido para um arquivo dedicado para evitar dependências circulares entre Hooks e Signals.
 */

// Status de carregamento de usuários e acessos
export const isUsersLoadingSignal = signal<boolean>(false);
export const hasUsersFetchedSignal = signal<boolean>(false);

// Status de carregamento de dados globais (Obras, Projetos, etc)
export const isLoadingDataSignal = signal<boolean>(false);
export const hasGlobalDataFetchedSignal = signal<boolean>(false);

// Status de carregamento de equipes
export const isTeamsLoadingSignal = signal<boolean>(false);
export const hasTeamsFetchedSignal = signal<boolean>(false);

// Status de carregamento de módulos adicionais (Mockados/Futuros)
export const has3dFetchedSignal = signal<boolean>(false);
export const hasReportsFetchedSignal = signal<boolean>(false);
export const hasAuditFetchedSignal = signal<boolean>(false);
export const hasCostsFetchedSignal = signal<boolean>(false);
export const hasEmployeesFetchedSignal = signal<boolean>(false);

// Computed para indicar se o sistema ainda está na fase crítica de sincronização inicial
export const isSyncingInitialDataSignal = computed(() => {
    // Se não há usuário logado, não há o que sincronizar inicialmente.
    if (!currentUserSignal.value) return false;

    // Agora consideramos a sincronização inicial como o combo de Usuários E Equipes
    const usersNotReady = !hasUsersFetchedSignal.value;
    const teamsNotReady = !hasTeamsFetchedSignal.value;

    return usersNotReady || teamsNotReady;
});
