import React from 'react';
import { usePermissions, UserPermission } from '@/hooks/usePermissions';

interface PermissionGateProps {
    children: React.ReactNode;
    permission?: UserPermission;
    permissions?: UserPermission[];
    any?: boolean; // Se true, canAny. Se false ou omitido, canAll.
    fallback?: React.ReactNode;
}

/**
 * Componente utilitário para renderizar conteúdo opcionalmente com base nas permissões do Custom SU.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
    children,
    permission,
    permissions = [],
    any = false,
    fallback = null
}) => {
    const { can, canAll, canAny } = usePermissions();

    const allPerms = permission ? [permission, ...permissions] : permissions;

    if (allPerms.length === 0) return <>{children}</>;

    const hasAccess = any ? canAny(allPerms) : canAll(allPerms);

    if (hasAccess) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
