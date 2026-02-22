import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/integrations/database';
import { storageService } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';

export interface Company {
    id: string;
    name: string;
    taxId: string | null;
    address: string | null;
    phone: string | null;
    logoUrl: string | null;
    createdAt: Date;
}

import { useAuth } from '@/contexts/AuthContext';
import { isGestaoGlobal, isCorporateRole } from '@/utils/permissionHelpers';

export function useCompanies() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const hasInitialFetched = useRef(false);
    const { toast } = useToast();
    const { profile } = useAuth();

    const profileId = profile?.id;
    const profileRole = profile?.role;
    const profileCompanyId = profile?.companyId;

    const loadCompanies = useCallback(async (force = false) => {
        // Se já estiver carregando e não for uma chamada forçada, ignora
        if (isLoading && !force) return;
        
        // Se já buscou inicialmente e não for forçado, ignora para evitar loops
        if (hasInitialFetched.current && !force) return;

        setIsLoading(true);
        hasInitialFetched.current = true;
        
        try {
            if (navigator.onLine) {
                let query = (db as any).from('companies').select('*').order('name');

                // Security filtering
                const isGod = isGestaoGlobal(profile) || isCorporateRole(profileRole);
                if (!isGod && profileCompanyId) {
                    query = query.eq('id', profileCompanyId);
                }

                const { data, error } = await query;

                if (error) throw error;

                const mapped = (data || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    taxId: c.taxId || c.tax_id,
                    address: c.address,
                    phone: c.phone,
                    logoUrl: c.logoUrl || c.logo_url,
                    createdAt: new Date(c.createdAt || c.created_at || Date.now()),
                }));

                setCompanies(mapped);
                storageService.setItem('companies', mapped);
            } else {
                const cached = await storageService.getItem<Company[]>('companies') || [];
                setCompanies(cached);
            }
        } catch (error) {
            console.error('Error loading companies:', error);
            const cached = await storageService.getItem<Company[]>('companies') || [];
            setCompanies(cached);
        } finally {
            setIsLoading(false);
        }
    }, [profileId, profileRole, profileCompanyId]);

    useEffect(() => {
        // Dispara apenas na montagem ou se as dependências fundamentais mudarem
        if (profileId) {
            loadCompanies();
        }
    }, [loadCompanies, profileId]);

    const createCompany = async (data: Partial<Company>) => {
        console.log('[useCompanies] Criando empresa com dados:', data);
        try {
            const payload: any = {
                name: data.name?.trim()
            };
            if (data.taxId?.trim()) payload.taxId = data.taxId.trim();
            if (data.address?.trim()) payload.address = data.address.trim();
            if (data.phone?.trim()) payload.phone = data.phone.trim();
            if (data.logoUrl?.trim()) payload.logoUrl = data.logoUrl.trim();

            console.log('[useCompanies] Payload final:', payload);

            const { data: created, error } = await (db as any)
                .from('companies')
                .insert(payload)
                .select()
                .single();

            if (error) {
                console.error('[useCompanies] Erro na inserção:', error);
                throw error;
            }

            console.log('[useCompanies] Empresa criada com sucesso:', created);

            const newCompany: Company = {
                id: created.id,
                name: created.name,
                taxId: created.taxId || created.tax_id,
                address: created.address,
                phone: created.phone,
                logoUrl: created.logoUrl || created.logo_url,
                createdAt: new Date(created.createdAt || created.created_at || Date.now())
            };

            setCompanies(prev => [...prev, newCompany]);
            return { success: true, data: newCompany };
        } catch (error: any) {
            console.error('[useCompanies] Exception in createCompany:', error);
            toast({ title: 'Erro ao criar empresa', description: error.message, variant: 'destructive' });
            return { success: false, error: error.message };
        }
    };

    const updateCompany = async (id: string, data: Partial<Company>) => {
        try {
            const payload: any = {
                name: data.name?.trim()
            };
            if (data.taxId !== undefined) payload.taxId = data.taxId?.trim() || null;
            if (data.address !== undefined) payload.address = data.address?.trim() || null;
            if (data.phone !== undefined) payload.phone = data.phone?.trim() || null;
            if (data.logoUrl !== undefined) payload.logoUrl = data.logoUrl?.trim() || null;

            const { data: updated, error } = await (db as any)
                .from('companies')
                .update(payload)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            const mapped: Company = {
                id: updated.id,
                name: updated.name,
                taxId: updated.taxId || updated.tax_id,
                address: updated.address,
                phone: updated.phone,
                logoUrl: updated.logoUrl || updated.logo_url,
                createdAt: new Date(updated.createdAt || updated.created_at || Date.now())
            };

            setCompanies(prev => prev.map(c => c.id === id ? mapped : c));
            return { success: true, data: mapped };
        } catch (error: any) {
            toast({ title: 'Erro ao atualizar empresa', description: error.message, variant: 'destructive' });
            return { success: false, error: error.message };
        }
    };

    const deleteCompany = async (id: string) => {
        try {
            const { error } = await (db as any)
                .from('companies')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setCompanies(prev => prev.filter(c => c.id !== id));
            return { success: true };
        } catch (error: any) {
            toast({ title: 'Erro ao excluir empresa', description: error.message, variant: 'destructive' });
            return { success: false, error: error.message };
        }
    };

    return {
        companies,
        isLoading,
        createCompany,
        updateCompany,
        deleteCompany,
        refresh: loadCompanies
    };
}


