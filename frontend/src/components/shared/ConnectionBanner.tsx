import React from 'react';
import { useSync } from '@/contexts/SyncContext';
import { Wifi, WifiOff, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectionBanner() {
    const { isOnline, isConnected, pendingChanges } = useSync();

    if (isOnline && isConnected && pendingChanges === 0) return null;

    return (
        <div className={cn(
            "w-full px-4 py-1 text-xs font-medium flex items-center justify-center gap-2 transition-all duration-300",
            !isOnline || !isConnected ? "bg-destructive text-destructive-foreground" : "bg-primary/20 text-primary"
        )}>
            {!isOnline ? (
                <>
                    <WifiOff className="w-3 h-3" />
                    <span>Modo Offline: Sem sinal de rede local</span>
                </>
            ) : !isConnected ? (
                <>
                    <CloudOff className="w-3 h-3" />
                    <span>Conectado à rede, mas sem resposta do servidor</span>
                </>
            ) : pendingChanges > 0 ? (
                <>
                    <Wifi className="w-3 h-3 animate-pulse" />
                    <span>Sincronizando {pendingChanges} alterações pendentes...</span>
                </>
            ) : null}
        </div>
    );
}
