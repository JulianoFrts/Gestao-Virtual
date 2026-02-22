import { signal, computed, effect } from "@preact/signals-react";

/**
 * Mapa de permissões granulares vindas do backend.
 * Ex: { "users.read": true, "production.manage": false }
 */
export const permissionsSignal = signal<Record<string, boolean>>({});

/**
 * Mapa de visibilidade de UI (Backend Driven UI).
 */
export const uiSignal = signal<Record<string, boolean>>({});

/**
 * Backups das permissões reais durante simulação.
 */
export const realPermissionsSignal = signal<Record<string, boolean> | null>(null);
export const realUiSignal = signal<Record<string, boolean> | null>(null);

/**
 * Perfil do usuário logado.
 */
export const currentUserSignal = signal<{
    id?: string;
    role?: string;
    hierarchyLevel?: number;
    isSystemAdmin?: boolean;
    permissions?: Record<string, boolean>;
    ui?: Record<string, boolean>;
} | null>(null);

/**
 * Papel simulado (Impersonation).
 */
const isDevEnv = import.meta.env.DEV && window.location.hostname === 'localhost';
export const simulationRoleSignal = signal<string | null>(
    isDevEnv ? localStorage.getItem("dev_sim_role") : null
);


/**
 * Contexto selecionado (Empresa, Obra, Canteiro).
 */
export const selectedContextSignal = signal<{
    companyId?: string;
    projectId?: string;
    siteId?: string;
} | null>(null);

/**
 * Indicador de carregamento da sessão.
 */
export const isAuthLoadingSignal = signal<boolean>(true);

/**
 * Modo de Mapeamento de Permissões (Visual Dev Tool).
 */
export const isMapperModeActiveSignal = signal<boolean>(
    isDevEnv ? localStorage.getItem("dev_mapper_active") === "true" : false
);

// [Dev Persistence] Salvar estados de simulação para sobreviver ao F5
if (isDevEnv) {
    effect(() => {
        if (simulationRoleSignal.value) {
            localStorage.setItem("dev_sim_role", simulationRoleSignal.value);
        } else {
            localStorage.removeItem("dev_sim_role");
        }
    });

    effect(() => {
        localStorage.setItem("dev_mapper_active", String(isMapperModeActiveSignal.value));
    });
}

// =============================================
// COMPUTED SIGNALS (CAPABILITIES)
// =============================================

/**
 * Verifica se o usuário é Administrador do Sistema (Owner).
 */
export const isSystemAdminSignal = computed(() => {
    const user = currentUserSignal.value;
    if (!user) return false;

    // Confiamos exclusivamente na flag vinda do Backend
    return !!user.isSystemAdmin;
});


/**
 * Verifica se o usuário tem Proteção Suprema (Escudo Dourado).
 */
export const isProtectedSignal = computed(() => {
    // Se estiver em simulação, a proteção depende estritamente do mapa simulado
    // que será injetado no permissionsSignal
    return !!permissionsSignal.value['*'] || 
           !!permissionsSignal.value['system.full_access'] || 
           !!permissionsSignal.value['system.is_protected'];
});

/**
 * Verifica se o usuário é do nível corporativo (Acesso a dashboards globais).
 */
export const isCorporateSignal = computed(() => 
    !!(uiSignal.value['showAdminMenu'] || permissionsSignal.value['system.is_corporate'])
);

/**
 * Verifica se o usuário pode acessar o painel administrativo.
 */
export const canAccessAdminSignal = computed(() => 
    !!(uiSignal.value['showAdminMenu'] || permissionsSignal.value['ui.admin_access'])
);

/**
 * Helper para verificar permissão específica.
 * Uso: can('employees.delete')
 */
export const can = (permission: string, targetLevel?: number) => {
    // Regra de Ouro: Confia no mapa do backend (incluindo Wildcards)
    if (permissionsSignal.value['*'] || permissionsSignal.value['system.full_access']) return true;

    const hasPerm = !!permissionsSignal.value[permission];
    if (!hasPerm) return false;

    if (targetLevel !== undefined && currentUserSignal.value) {
        const myLevel = currentUserSignal.value.hierarchyLevel || 0;
        return myLevel > targetLevel;
    }

    return true;
};

/**
 * Helper para verificar visibilidade de UI.
 * Uso: show('showSettings')
 */
export const show = (flag: string) => !!uiSignal.value[flag];

/**
 * Helper para verificar se o usuário pode gerenciar um módulo.
 */
export const canManage = (module: string) =>
    !!(permissionsSignal.value[`${module}.manage`] ||
        permissionsSignal.value[`${module}.create`] ||
        permissionsSignal.value[`${module}.update`] ||
        permissionsSignal.value[`${module}.delete`] ||
        permissionsSignal.value[module]);
