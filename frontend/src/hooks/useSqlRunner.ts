import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QueryResult {
    success: boolean;
    data?: any;
    message?: string;
}

export function useSqlRunner() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const { session } = useAuth();

    const executeQuery = useCallback(async (query: string) => {
        setLoading(true);
        setError(null);
        setResults([]);
        
        try {
            const envUrl = import.meta.env.VITE_API_URL || '/api/v1';
            const apiUrl = envUrl.startsWith('http')
                ? envUrl
                : `${window.location.origin}${envUrl.startsWith('/') ? '' : '/'}${envUrl}`;
            
            const headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch(`${apiUrl}/db/query`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ query })
            });

            if (response.status === 401) throw new Error('Sessão expirada. Faça login novamente.');
            if (response.status === 403) throw new Error('Sem permissão para executar queries.');

            const res: QueryResult = await response.json();
            
            if (res.success) {
                const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
                setResults(data);
                toast.success('Query executada com sucesso');
                return data;
            } else {
                throw new Error(res.message || 'Erro ao executar query');
            }
        } catch (err: any) {
            const msg = err.message || 'Erro desconhecido';
            setError(msg);
            toast.error('Erro na execução');
            return null;
        } finally {
            setLoading(false);
        }
    }, [session]);

    return {
        loading,
        error,
        results,
        executeQuery
    };
}
