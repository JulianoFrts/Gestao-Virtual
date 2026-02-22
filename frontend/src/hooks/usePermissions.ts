import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type UserPermission =
    // Funcionários
    | 'employees.view' | 'employees.edit' | 'employees.delete'
    // Funções / Cargos
    | 'functions.view' | 'functions.create' | 'functions.update' | 'functions.delete'
    // Equipes
    | 'teams.view' | 'teams.edit' | 'teams.delete' | 'teams.create' | 'teams.update' | 'teams.manage'
    // Registros de Ponto
    | 'records.view' | 'records.edit' | 'records.delete'
    | 'time_records.view' | 'time_records.manage'
    // Relatórios / RDO
    | 'reports.view' | 'reports.create' | 'reports.delete'
    | 'daily_reports.create' | 'daily_reports.manage' | 'daily_reports.schedule' | 'daily_reports.audit'
    // Projetos / Obras
    | 'projects.view' | 'projects.create' | 'projects.edit' | 'projects.update'
    | 'projects.delete' | 'projects.rename' | 'projects.delegate' | 'projects.progress'
    // Empresas
    | 'companies.view' | 'companies.create' | 'companies.edit' | 'companies.delete'
    // Canteiros / Sites
    | 'sites.view' | 'sites.create' | 'sites.edit' | 'sites.delete'
    // Mensagens
    | 'messages.view' | 'messages.create' | 'messages.delete' | 'messages.manage_status'
    // Mapa / Geo / 3D
    | 'map.view' | 'map.edit' | 'map.manage'
    | 'viewer_3d.view' | 'geo_viewer.view'
    // Produção & Custos
    | 'production.view' | 'production.planning' | 'production.analytics'
    | 'costs.view' | 'costs.manage'
    // GAPO
    | 'gapo.view' | 'gapo.manage'
    // Administração
    | 'users.view' | 'users.create' | 'users.edit' | 'users.delete' | 'users.manage'
    | 'custom_su.manage' | 'permissions.manage'
    | 'audit_logs.view'
    | 'su.manage' | 'settings.view' | 'settings.edit'
    | 'db_hub.manage' | 'data_ingestion.manage'
    // Dashboard
    | 'dashboard.view'
    // Sistema
    | 'system.is_corporate' | 'system_messages.manage'
    | 'ui.admin_access';

export function usePermissions() {
    const { profile } = useAuth();

    /**
     * Verifica se o usuário tem uma permissão específica.
     * @param permission Código do módulo/ação (ex: 'employees.delete')
     * @returns boolean
     */
    const can = useCallback((permission: UserPermission): boolean => {
        if (!profile) return false;

        // Regra de Ouro: SUPERADMINGOD (isSystemAdmin) tem passe livre em tudo
        if (profile.isSystemAdmin) return true;

        // Se o mapa de permissões estiver carregado no profile, verificamos lá
        // Caso contrário, retorna falso por segurança (fail-closed)
        const userPermissions = (profile as any).permissions || {};
        return !!userPermissions[permission];
    }, [profile]);

    /**
     * Verifica multiplas permissões (AND)
     */
    const canAll = useCallback((permissions: UserPermission[]): boolean => {
        return permissions.every(p => can(p));
    }, [can]);

    /**
     * Verifica se tem pelo menos uma das permissões (OR)
     */
    const canAny = useCallback((permissions: UserPermission[]): boolean => {
        return permissions.some(p => can(p));
    }, [can]);

    return {
        can,
        canAll,
        canAny
    };
}
