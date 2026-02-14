import { useState, useEffect, useCallback } from 'react';
import { orionApi } from '@/integrations/orion/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cacheService } from '@/services/cacheService';
import type { ModelTransform } from '@/components/map/cable-config-modal';

export interface PlacemarkOverride {
    name?: string;
    angle?: number;
    color?: string;
    height?: number;
    elevation?: number;
    customModelUrl?: string;
    customModelTransform?: ModelTransform;
    texture?: string;
}

export function useProjectVisibility(selectedProjectId: string) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [hiddenPlacemarkIds, setHiddenPlacemarkIds] = useState<Set<string>>(new Set());
    const [placemarkOverrides, setPlacemarkOverrides] = useState<Record<string, PlacemarkOverride>>({});
    const [isLoading, setIsLoading] = useState(false);

    const loadVisibility = useCallback(async () => {
        if (!profile?.id) return;
        setIsLoading(true);
        try {
            const { data, error } = await orionApi
                .from('map_element_visibility')
                .select('*')
                .eq('userId', profile.id);

            if (error) throw error;

            if (data) {
                const hiddenSet = new Set<string>();
                const overrides: Record<string, PlacemarkOverride> = {};

                (data as any[]).forEach(item => {
                    const eElementId = item.elementId || item.element_id;
                    const eProjectId = item.projectId || item.project_id;
                    const eDocumentId = item.documentId || item.document_id;
                    const eIsHidden = item.isHidden !== undefined ? item.isHidden : item.is_hidden;

                    const effectiveDocId = eDocumentId || eProjectId;
                    const compositeId = `${effectiveDocId}:::${eElementId}`;

                    if (eIsHidden) {
                        hiddenSet.add(compositeId);
                    }

                    overrides[compositeId] = {
                        name: item.elementName || item.element_name,
                        angle: item.elementAngle !== undefined ? item.elementAngle : item.element_angle,
                        color: item.elementColor || item.element_color,
                        height: item.elementHeight !== undefined ? item.elementHeight : item.element_height,
                        elevation: item.elementElevation !== undefined ? item.elementElevation : item.element_elevation,
                        customModelUrl: item.customModelUrl || item.custom_model_url,
                        customModelTransform: (item.customModelTransform || item.custom_model_transform) as ModelTransform,
                        texture: item.elementTexture || item.element_texture
                    };
                });

                setHiddenPlacemarkIds(hiddenSet);
                setPlacemarkOverrides(overrides);
            }
        } catch (err) {
            console.error('Error loading visibility settings:', err);
        } finally {
            setIsLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        loadVisibility();
    }, [loadVisibility]);

    const hidePlacemark = async (docId: string, elementId: string, name: string) => {
        if (!profile?.id) return;
        const compositeId = `${docId}:::${elementId}`;

        // Optimistic update
        setHiddenPlacemarkIds(prev => {
            const next = new Set(prev);
            next.add(compositeId);
            return next;
        });

        try {
            const projectId = (docId === selectedProjectId) ? selectedProjectId : undefined; // Simplified

            const { error } = await orionApi
                .from('map_element_visibility')
                .upsert({
                    userId: profile.id,
                    projectId: selectedProjectId !== 'all' ? selectedProjectId : (projectId || null),
                    documentId: docId === selectedProjectId ? null : docId,
                    elementId: elementId,
                    elementName: name,
                    isHidden: true
                }, {
                    onConflict: 'user_id, project_id, element_id, document_id'
                });

            if (error) throw error;
        } catch (err: any) {
            console.error('Error hiding placemark:', err);
            setHiddenPlacemarkIds(prev => {
                const next = new Set(prev);
                next.delete(compositeId);
                return next;
            });
            toast({ title: "Erro ao ocultar", description: err.message, variant: "destructive" });
        }
    };

    const showPlacemark = async (docId: string, elementId: string, name: string) => {
        if (!profile?.id) return;
        const compositeId = `${docId}:::${elementId}`;

        setHiddenPlacemarkIds(prev => {
            const next = new Set(prev);
            next.delete(compositeId);
            return next;
        });

        try {
            const { error } = await orionApi
                .from('map_element_visibility')
                .upsert({
                    userId: profile.id,
                    projectId: selectedProjectId !== 'all' ? selectedProjectId : null,
                    documentId: docId === selectedProjectId ? null : docId,
                    elementId: elementId,
                    elementName: name,
                    isHidden: false
                }, {
                    onConflict: 'user_id, project_id, element_id, document_id'
                });

            if (error) throw error;
        } catch (err: any) {
            console.error('Error showing placemark:', err);
            setHiddenPlacemarkIds(prev => {
                const next = new Set(prev);
                next.add(compositeId);
                return next;
            });
            toast({ title: "Erro ao reativar", description: err.message, variant: "destructive" });
        }
    };

    const updateOverride = async (docId: string, elementId: string, override: Partial<PlacemarkOverride>) => {
        if (!profile?.id) return;
        const compositeId = `${docId}:::${elementId}`;

        // Local State
        setPlacemarkOverrides(prev => ({
            ...prev,
            [compositeId]: { ...prev[compositeId], ...override }
        }));

        try {
            // Save to DB
            const data: any = {
                userId: profile.id,
                projectId: selectedProjectId !== 'all' ? selectedProjectId : null,
                documentId: docId === selectedProjectId ? null : docId,
                elementId: elementId,
                isHidden: false,
                ...override
            };

            // Map frontend override keys to DB expected keys if necessary
            // e.g. height -> elementHeight
            if (override.height !== undefined) data.elementHeight = override.height;
            if (override.angle !== undefined) data.elementAngle = override.angle;
            if (override.color !== undefined) data.elementColor = override.color;
            if (override.name !== undefined) data.elementName = override.name;
            if (override.texture !== undefined) data.elementTexture = override.texture;

            const { error } = await orionApi.from('map_element_visibility').upsert(data, {
                onConflict: 'user_id, project_id, element_id, document_id'
            });

            if (error) throw error;
        } catch (err: any) {
            console.error('Error updating override:', err);
            toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
        }
    };

    const showAllHidden = async () => {
        if (!profile?.id) return;

        // Optimistic clear
        setHiddenPlacemarkIds(new Set());

        try {
            // Construir query params manualmente para garantir UPDATE em massa (PUT com query params)
            // O OrionClient pode não converter .eq() em query params para métodos de UPDATE corretamente
            const params: Record<string, string> = { userId: profile.id };
            if (selectedProjectId && selectedProjectId !== 'all') {
                params['projectId'] = selectedProjectId;
            }

            // Usamos o método 'request' diretamente para ter controle total
            // Enviando PUT /api/v1/map_element_visibility?userId=...
            const { error } = await orionApi['request'](
                '/map_element_visibility',
                'PUT',
                { isHidden: false }, // Body
                params // Query params
            );

            if (error) throw error;
            toast({ title: "Lista limpa", description: "Todos os elementos foram reativados com sucesso." });
        } catch (err: any) {
            console.error('Error showing all placemarks:', err);
            // Revert state on error by reloading
            loadVisibility();
            toast({ title: "Erro ao reativar", description: err.message, variant: "destructive" });
        }
    };

    return {
        hiddenPlacemarkIds,
        placemarkOverrides,
        isLoading,
        hidePlacemark,
        showPlacemark,
        showAllHidden,
        updateOverride,
        refresh: loadVisibility,
        setHiddenPlacemarkIds,
        setPlacemarkOverrides
    };
}
