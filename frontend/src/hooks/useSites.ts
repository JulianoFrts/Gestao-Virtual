import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/integrations/database';
import { storageService } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isGestaoGlobal, isCorporateRole } from '@/utils/permissionHelpers';

export interface Site {
    id: string;
    projectId: string;
    companyId: string;
    name: string;
    locationDetails: string | null;
    plannedHours: number;
    xLat: number | null;
    yLa: number | null;
    createdAt: Date;
}


export function useSites(projectId?: string, companyId?: string) {
    const [sites, setSites] = useState<Site[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { profile } = useAuth();
    const hasInitialFetched = useRef(false);

    const profileId = profile?.id;
    const profileRole = profile?.role;
    const profileCompanyId = profile?.companyId;

    const loadSites = useCallback(async (force = false) => {
        if ((isLoading || hasInitialFetched.current) && !force) return;

        setIsLoading(true);
        hasInitialFetched.current = true;
        
        try {
            if (navigator.onLine) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let query = (db as any).from('sites').select('*, project(id, company_id)');

                // Security/Filtering Logic:
                const isGod = isGestaoGlobal(profile) || isCorporateRole(profileRole, profile);
                const effectiveCompanyId = companyId || (isGod ? undefined : profileCompanyId);

                if (projectId) query = query.eq('project_id', projectId);
                if (effectiveCompanyId) query = query.eq('company_id', effectiveCompanyId);

                const { data, error } = await query.order('name');

                if (error) throw error;

                // Unwrapping robusto para extrair a lista real de itens
                let rawData: any[] = [];
                if (Array.isArray(data)) {
                    if (data.length === 1 && data[0] && Array.isArray((data[0] as any).items)) {
                        rawData = (data[0] as any).items;
                    } else {
                        rawData = data;
                    }
                } else if (data && Array.isArray((data as any).items)) {
                    rawData = (data as any).items;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mapped: Site[] = rawData.map((s: any) => ({
                    id: s.id,
                    projectId: s.projectId || s.project_id || s.project?.id,
                    companyId: s.companyId || s.company_id || s.project?.companyId || s.project?.company_id,
                    name: s.name,
                    locationDetails: s.locationDetails || s.location_details,
                    plannedHours: Number(s.plannedHours || s.planned_hours || 0),
                    xLat: Number(s.xLat || s.x_lat || 0) || null,
                    yLa: Number(s.yLa || s.y_la || 0) || null,
                    createdAt: new Date(s.createdAt || s.created_at || Date.now()),
                }));

                setSites(mapped);
                await storageService.setItem('sites', mapped);
            } else {
                const cached = await storageService.getItem<Site[]>('sites') || [];
                let filtered = cached;
                if (projectId) filtered = filtered.filter(s => s.projectId === projectId);
                if (companyId) filtered = filtered.filter(s => s.companyId === companyId);
                setSites(filtered);
            }
        } catch (error) {
            console.error('Error loading sites:', error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, companyId, profileId, profileRole, profileCompanyId]);

    useEffect(() => {
        if (profileId) {
            loadSites();
        }
    }, [loadSites, profileId]);

    const createSite = async (data: Partial<Site>) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: created, error } = await (db as any)
                .from('sites')
                .insert({
                    project_id: data.projectId,
                    name: data.name,
                    location_details: data.locationDetails,
                    planned_hours: data.plannedHours || 0,
                    x_lat: data.xLat || null,
                    y_la: data.yLa || null
                })
                .select()
                .single();

            if (error) throw error;

            const newSite: Site = {
                id: created.id,
                projectId: created.projectId || created.project_id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                companyId: data.companyId || (created as any).project?.companyId || (created as any).project?.company_id,
                name: created.name,
                locationDetails: created.locationDetails || created.location_details,
                plannedHours: Number(created.plannedHours || created.planned_hours || 0),
                xLat: Number(created.xLat || created.x_lat || 0) || null,
                yLa: Number(created.yLa || created.y_la || 0) || null,
                createdAt: new Date(created.createdAt || created.created_at)
            };

            setSites(prev => [...prev, newSite]);
            return { success: true, data: newSite };
        } catch (error: any) {
            toast({ title: 'Erro ao criar canteiro', description: error.message, variant: 'destructive' });
            return { success: false, error: error.message };
        }
    };

    const updateSite = async (id: string, data: Partial<Site>) => {
        try {
            const { data: updated, error } = await (db as any)
                .from('sites')
                .update({
                    project_id: data.projectId,
                    name: data.name,
                    location_details: data.locationDetails,
                    planned_hours: data.plannedHours !== undefined ? data.plannedHours : undefined,
                    x_lat: data.xLat !== undefined ? data.xLat : undefined,
                    y_la: data.yLa !== undefined ? data.yLa : undefined
                })
                .eq('id', id)
                .select('*, project(company_id)')
                .single();

            if (error) throw error;

            const mapped: Site = {
                id: updated.id,
                projectId: updated.projectId || updated.project_id,
                companyId: data.companyId || (updated as any).project?.companyId || (updated as any).project?.company_id,
                name: updated.name,
                locationDetails: updated.locationDetails || updated.location_details,
                plannedHours: Number(updated.plannedHours || updated.planned_hours || 0),
                xLat: Number(updated.xLat || updated.x_lat || 0) || null,
                yLa: Number(updated.yLa || updated.y_la || 0) || null,
                createdAt: new Date(updated.createdAt || updated.created_at)
            };

            setSites(prev => prev.map(s => s.id === id ? mapped : s));
            return { success: true, data: mapped };
        } catch (error: any) {
            toast({ title: 'Erro ao atualizar canteiro', description: error.message, variant: 'destructive' });
            return { success: false, error: error.message };
        }
    };

    const deleteSite = async (id: string) => {
        try {
            const { error } = await (db as any)
                .from('sites')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSites(prev => prev.filter(s => s.id !== id));
            return { success: true };
        } catch (error: any) {
            toast({ title: 'Erro ao excluir canteiro', description: error.message, variant: 'destructive' });
            return { success: false, error: error.message };
        }
    };

    return {
        sites,
        isLoading,
        createSite,
        updateSite,
        deleteSite,
        refresh: loadSites
    };
}


