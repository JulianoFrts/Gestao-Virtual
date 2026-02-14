import React, { useState } from 'react';
import {
    Database,
    Code2,
    Play,
    Layout,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// --- SQL Console Component ---
const SqlConsole = () => {
    const [query, setQuery] = useState('SELECT * FROM "users" LIMIT 10;');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { session } = useAuth();

    const executeQuery = async () => {
        setLoading(true);
        setError(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
            const accessToken = session?.access_token || session?.token || (session?.user?.id ? 'SESSION_COOKIE' : '');

            // If using NextAuth cookies, credentials: include is needed
            // If using Supabase/JWT, Authorization header is needed.
            // Based on session.ts, it checks Bearer token first, then cookie.

            const headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch(`${apiUrl}/db/query`, {
                method: 'POST',
                headers,
                // Include cookies for NextAuth session support
                credentials: 'include',
                body: JSON.stringify({ query })
            });

            // Handle non-200 responses
            if (response.status === 401) {
                throw new Error('Sessão expirada ou não autorizada. Faça login novamente.');
            }
            if (response.status === 403) {
                throw new Error('Você não tem permissão de Administrador para executar queries.');
            }

            const res = await response.json();
            if (res.success) {
                setResults(Array.isArray(res.data) ? res.data : [res.data]);
                toast.success('Query executada com sucesso');
            } else {
                setError(res.message || 'Erro ao executar query');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
                        <Code2 className="w-4 h-4" />
                        SQL Editor
                    </div>
                    <Button
                        size="sm"
                        onClick={executeQuery}
                        disabled={loading}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
                    >
                        <Play className="w-4 h-4" />
                        Executar (F5)
                    </Button>
                </div>
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 w-full p-4 bg-transparent text-cyan-50 font-mono text-sm resize-none focus:outline-none"
                    spellCheck={false}
                />
            </div>

            <div className="h-1/3 flex flex-col bg-zinc-900 rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center p-3 bg-white/5 border-b border-white/5 text-xs font-bold uppercase tracking-widest text-white/40 gap-2">
                    <Layout className="w-4 h-4" />
                    Resultados
                </div>
                <ScrollArea className="flex-1">
                    {error && (
                        <div className="p-4 flex items-center gap-3 text-red-400 bg-red-500/10 m-4 rounded-lg border border-red-500/20">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    {results.length > 0 ? (
                        <div className="p-0">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 bg-zinc-900 border-b border-white/10">
                                    <tr>
                                        {Object.keys(results[0]).map(key => (
                                            <th key={key} className="p-3 font-bold text-white/60 border-r border-white/5 last:border-0">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="p-3 text-white/80 font-mono border-r border-white/5 last:border-0 truncate max-w-[200px]">
                                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : !error && (
                        <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2 py-10">
                            <Database className="w-12 h-12 opacity-10" />
                            <p>Nenhum dado retornado ou query pendente</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
};

// --- Main Page Component ---
export default function DatabaseHub() {
    return (
        <div className="p-6 h-[calc(100vh-100px)] flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/30">
                        <Database className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            Database Hub
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full border border-cyan-500/20 font-mono">v1.2</span>
                        </h1>
                        <p className="text-sm text-white/40">Gerenciamento interativo de dados e infraestrutura PostgreSQL</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Content - Simplified for debugging */}
            <div className="flex-1 flex flex-col min-h-0">
                <Tabs defaultValue="console" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="bg-white/5 border border-white/10 p-1 mb-6 self-start rounded-xl">
                        <TabsTrigger value="console" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white gap-2 rounded-lg px-6">
                            <Code2 className="w-4 h-4" />
                            SQL Console
                        </TabsTrigger>
                        <TabsTrigger value="diagram" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white gap-2 rounded-lg px-6">
                            <Layout className="w-4 h-4" />
                            Diagram Designer (Em breve)
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="console" className="flex-1 mt-0">
                        <SqlConsole />
                    </TabsContent>

                    <TabsContent value="diagram" className="flex-1 mt-0">
                        <div className="flex flex-col items-center justify-center h-full text-white/40">
                            <p>O Designer de Diagramas está sendo otimizado para o seu ambiente.</p>
                            <p className="text-xs">O SQL Console está totalmente operacional.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
