import { useState, useEffect, useCallback, useRef } from 'react';
import { orionApi } from '@/integrations/orion/client';
import { storageService } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Company {
    id: string;
    name: string;
    taxId: string | null;
    address: string | null;
    phone: string | null;
    logoUrl: string | null;
    createdAt: Date;
}

export function useCompanies() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const hasInitialFetched = useRef(false);
    const { toast } = useToast();
    const { profile } = useAuth();

    const profileId = profile?.id;

    const loadCompanies = useCallback(async (force = false) => {
        if (isLoading && !force) return;
        if (hasInitialFetched.current && !force) return;

        setIsLoading(true);
        hasInitialFetched.current = true;
        
        try {
            if (navigator.onLine) {
                // Usar orionApi diretamente para evitar problemas de compatibilidade com db syntax
                const { data, error } = await orionApi.get<any>('/companies');

                if (error) throw error;

                // O backend retorna { items, pagination } ou apenas o array
                const rawItems = Array.isArray(data) ? data : (data?.items || []);
                
                const mapped: Company[] = rawItems.map((c: any) => ({
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
        } catch (error: any) {
            console.error('[useCompanies] Error loading companies:', error);
            const cached = await storageService.getItem<Company[]>('companies') || [];
            setCompanies(cached);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    useEffect(() => {
        if (profileId) {
            loadCompanies();
        }
    }, [profileId, loadCompanies]);

    const createCompany = async (companyData: Partial<Company>) => {
        try {
            const { data: created, error } = await orionApi.post<any>('/companies', companyData);

            if (error) throw error;

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
            console.error('[useCompanies] Error creating company:', error);
            toast({ title: 'Erro ao criar empresa', description: error.message, variant: 'destructive' });
            return { success: false, error: error.message };
        }
    };

    const updateCompany = async (id: string, companyData: Partial<Company>) => {
        try {
            const { data: updated, error } = await orionApi.put<any>(`/companies/${id}`, companyData);

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
            console.error('[useCompanies] Error updating company:', error);
            toast({ title: 'Erro ao atualizar empresa', description: error.message, variant: 'destructive' });
            return { success: false, error: error.message };
        }
    };

    const deleteCompany = async (id: string) => {
        try {
            const { error } = await orionApi.delete(`/companies/${id}`);

            if (error) throw error;

            setCompanies(prev => prev.filter(c => c.id !== id));
            return { success: true };
        } catch (error: any) {
            console.error('[useCompanies] Error deleting company:', error);
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
        refresh: () => loadCompanies(true)
    };
}


