import React from 'react';
import { usePermissions, UserPermission } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';
import { simulationRoleSignal, isMapperModeActiveSignal } from '@/signals/authSignals';
import { useSignals } from '@preact/signals-react/runtime';

export type AccessMode = 'hide' | 'lock' | 'read-only' | 'mask' | 'disabled';

export interface AccessRule {
    auth: UserPermission | UserPermission[];
    mode: AccessMode;
    any?: boolean;
}

interface AccessProps {
    children: React.ReactNode;
    auth?: UserPermission | UserPermission[];
    mode?: AccessMode;
    any?: boolean;
    fallback?: React.ReactNode;
    rules?: AccessRule[];
}

/**
 * Access (SmartPermissionWrapper)
 * Versão 4.0: Suporte a Multi-Rules e Selectability
 */
export const Access: React.FC<AccessProps> = ({
    children,
    auth,
    mode = 'hide',
    any = false,
    fallback = null,
    rules = []
}) => {
    useSignals();
    const { canAll, canAny } = usePermissions();
    const isMapperActive = isMapperModeActiveSignal.value;

    // Normalização: Se auth/mode forem passados via props legadas, transformamos em regra
    const effectiveRules: AccessRule[] = rules.length > 0 
        ? rules 
        : auth ? [{ auth, mode, any }] : [];

    // Se não houver nenhuma regra, renderiza normal
    if (effectiveRules.length === 0) return <>{children}</>;

    // Avaliação de Regras Sequenciais
    // A primeira regra que NÃO passar define o modo de restrição.
    let appliedRule: AccessRule | null = null;
    for (const rule of effectiveRules) {
        const perms = Array.isArray(rule.auth) ? rule.auth : [rule.auth];
        const hasAccess = rule.any ? canAny(perms) : canAll(perms);
        
        if (!hasAccess) {
            appliedRule = rule;
            break;
        }
    }

    // [MAPPER MODE] Se o modo de mapeamento estiver ativo (DEV + LOCALHOST apenas)
    const renderWithMapper = (content: React.ReactNode) => {
        const isSafeDev = import.meta.env.DEV && window.location.hostname === 'localhost';
        if (!isMapperActive || !isSafeDev) return content;

        // Mostrar todas as regras no label do mapper
        const label = effectiveRules.map(r => 
            `${Array.isArray(r.auth) ? r.auth.join('&') : r.auth}(${r.mode})`
        ).join(' ➔ ');

        return (
            <div className="relative group/mapper ring-2 ring-purple-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 rounded-sm transition-all animate-in zoom-in-95 duration-200">
                <div className="absolute -top-6 left-0 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-t-sm whitespace-nowrap z-100 opacity-0 group-hover/mapper:opacity-100 transition-opacity">
                   🔐 {label}
                </div>
                {content}
            </div>
        );
    };

    const renderContent = () => {
        // Se todas as regras passaram, renderiza normal
        if (!appliedRule) return <>{children}</>;

        const perms = Array.isArray(appliedRule.auth) ? appliedRule.auth : [appliedRule.auth];

        // Se falhou em alguma regra, aplica o modo daquela regra
        switch (appliedRule.mode) {
            case 'hide':
                return <>{fallback}</>;

            case 'lock':
                return React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        const childElement = child as React.ReactElement<any>;
                        const childProps = childElement.props || {};
                        return React.cloneElement(childElement, {
                            disabled: true,
                            onClick: (e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toast({
                                    title: "Recurso Travado",
                                    description: `Requer: ${perms.join(' & ')}`,
                                    variant: "destructive"
                                });
                            },
                            className: `${childProps.className || ''} relative opacity-70 cursor-not-allowed`,
                            children: (
                                <>
                                    <Lock className="inline-block w-3 h-3 mr-1 text-amber-500" />
                                    {childProps.children}
                                </>
                            )
                        });
                    }
                    return child;
                }) as any;

            case 'read-only':
                return React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        const childProps = (child.props as any) || {};
                        // [FIX] Remover disabled para permitir copiar o texto
                        return React.cloneElement(child, {
                            readOnly: true,
                            // Mantemos disabled apenas se o componente não suportar readOnly puro
                            // Mas para Inputs padrão, readOnly permite seleção.
                            placeholder: "Somente leitura",
                            className: `${childProps.className || ''} bg-slate-100/50 dark:bg-slate-900/50 border-dashed cursor-text`
                        } as any);
                    }
                    return child;
                }) as any;

            case 'disabled':
                return React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        const childProps = (child.props as any) || {};
                        return React.cloneElement(child, {
                            disabled: true,
                            className: `${childProps.className || ''} opacity-50 cursor-not-allowed`
                        } as any);
                    }
                    return child;
                }) as any;

            case 'mask':
                return <span className="blur-xs select-none opacity-50 cursor-help" title="Conteúdo protegido">*********</span>;

            default:
                return <>{fallback}</>;
        }
    };

    return <>{renderWithMapper(renderContent())}</>;
};
