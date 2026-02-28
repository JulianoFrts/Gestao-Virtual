import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storageService';

export function BackgroundMonitor() {
    const { user, profile } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Monitoramento de Localização contínuo usando watchPosition
        let watchId: number | null = null;

        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString()
                    };
                    storageService.setItem('last_known_location', loc);
                    console.debug('Background Location Sync (Watch):', loc);
                },
                (error: GeolocationPositionError) => {
                    if (error.code !== 1) { // 1 = Permission Denied
                        console.warn('Background Location Error:', error.message);
                    }
                },
                {
                    enableHighAccuracy: false, // Modo econômico
                    timeout: 10000,
                    maximumAge: 30000 // Aceita cache de 30s
                }
            );
        }

        // Persistência de Sessão e Perfil (a cada 10 segundos para redundância)
        const sessionInterval = setInterval(async () => {
            if (user && profile) {
                // Garantir que os dados mais recentes estejam sempre no cache offline
                await storageService.setItem('offline_auth_snapshot', {
                    user,
                    profile,
                    timestamp: new Date().toISOString()
                });

                // Também atualizar o cache de login offline unificado se necessário
                const offlineLogins = await storageService.getItem<any[]>('offline_login_cache') || [];
                const existingIndex = offlineLogins.findIndex(l => l.profile?.id === profile.id);

                if (existingIndex !== -1) {
                    offlineLogins[existingIndex].profile = profile;
                    await storageService.setItem('offline_login_cache', offlineLogins);
                }
            }
        }, 10000);

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            clearInterval(sessionInterval);
        };
    }, [user, profile]);

    return null; // Componente invisível de serviço
}
