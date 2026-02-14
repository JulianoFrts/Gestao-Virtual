import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type UserPermission =
    | 'employees.view' | 'employees.edit' | 'employees.delete'
    | 'teams.view' | 'teams.edit' | 'teams.delete'
    | 'records.view' | 'records.edit' | 'records.delete'
    | 'reports.view' | 'reports.create' | 'reports.delete'
    | 'su.manage' | 'settings.view' | 'messages.view'
    | 'map.view' | 'map.edit' | 'map.manage';

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
