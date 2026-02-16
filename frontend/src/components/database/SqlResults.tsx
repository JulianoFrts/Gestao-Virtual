import React from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AlertCircle, Database } from 'lucide-react';

interface SqlResultsProps {
    results: any[];
    error: string | null;
    loading: boolean;
}

export function SqlResults({ results, error, loading }: SqlResultsProps) {
    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-white/40 gap-3 animate-pulse">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs uppercase tracking-widest">Executando...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                 <div className="max-w-md p-4 flex items-start gap-3 text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">Erro na Execução</h4>
                        <p className="text-xs opacity-90 font-mono">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2">
                <Database className="w-12 h-12 opacity-10" />
                <p className="text-sm">Nenhum dado para exibir</p>
            </div>
        );
    }

    const columns = Object.keys(results[0]);

    return (
        <ScrollArea className="h-full w-full rounded-md border border-white/5 bg-zinc-900/50">
            <div className="min-w-max p-4">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-white/5 text-white/60">
                        <tr>
                            {columns.map(key => (
                                <th key={key} className="p-3 font-bold border-b border-white/10 whitespace-nowrap">
                                    {key}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((row, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                {columns.map((col, j) => (
                                    <td key={j} className="p-3 text-white/80 font-mono border-r border-white/5 last:border-0 max-w-[300px] truncate group-hover:text-white">
                                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
        </ScrollArea>
    );
}
