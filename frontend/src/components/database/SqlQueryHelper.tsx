import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    Plus, 
    X, 
    Database, 
    Table as TableIcon, 
    Columns, 
    Filter, 
    ArrowRight, 
    BookOpen,
    Sparkles,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSqlRunner } from '@/hooks/useSqlRunner';

interface SchemaInfo {
    table: string;
    columns: string[];
}

interface QueryBuilderState {
    type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    selectColumns: string[];
    filters: Array<{ column: string; operator: string; value: string }>;
    limit: number;
}

export function SqlQueryHelper({ onSelectQuery }: { onSelectQuery: (sql: string) => void }) {
    const { executeQuery } = useSqlRunner();
    const [schema, setSchema] = useState<SchemaInfo[]>([]);
    const [activeTab, setActiveTab] = useState<'build' | 'templates'>('build');
    const [queryState, setQueryState] = useState<QueryBuilderState>({
        type: 'SELECT',
        table: '',
        selectColumns: [],
        filters: [],
        limit: 100
    });

    // Load schema for suggestions
    useEffect(() => {
        const loadSchema = async () => {
            const res = await executeQuery(`
                SELECT table_name, column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position
            `);
            if (res) {
                const grouped: Record<string, string[]> = {};
                res.forEach((r: any) => {
                    if (!grouped[r.table_name]) grouped[r.table_name] = [];
                    grouped[r.table_name].push(r.column_name);
                });
                setSchema(Object.entries(grouped).map(([table, columns]) => ({ table, columns })));
            }
        };
        loadSchema();
    }, [executeQuery]);

    const selectedTableCols = useMemo(() => 
        schema.find(s => s.table === queryState.table)?.columns || [], 
    [schema, queryState.table]);

    // Generate SQL string based on state
    const generatedSql = useMemo(() => {
        if (!queryState.table) return '-- Selecione uma tabela para começar...';
        
        let sql = `SELECT ${queryState.selectColumns.length > 0 ? queryState.selectColumns.join(', ') : '*'} \nFROM "${queryState.table}"`;
        
        if (queryState.filters.length > 0) {
            const filterStr = queryState.filters
                .filter(f => f.column && f.value)
                .map(f => `"${f.column}" ${f.operator} '${f.value}'`)
                .join(' AND ');
            if (filterStr) sql += ` \nWHERE ${filterStr}`;
        }
        
        sql += ` \nLIMIT ${queryState.limit};`;
        return sql;
    }, [queryState]);

    const addFilter = () => {
        setQueryState(prev => ({
            ...prev,
            filters: [...prev.filters, { column: '', operator: '=', value: '' }]
        }));
    };

    return (
        <Card className="flex flex-col h-full bg-[#09090b] border-white/5 overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex gap-1 bg-black/40 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('build')}
                        className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", activeTab === 'build' ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-slate-300")}
                    >
                        Builder
                    </button>
                    <button 
                        onClick={() => setActiveTab('templates')}
                        className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", activeTab === 'templates' ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-slate-300")}
                    >
                        Templates
                    </button>
                </div>
                <div className="flex items-center gap-2 text-cyan-500/50">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Intelligent Engine</span>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                    {/* Step 1: Select Table */}
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                                <TableIcon className="w-4 h-4" />
                             </div>
                             <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Escolha a Tabela</h4>
                        </div>
                        
                        <Select 
                            value={queryState.table}
                            onValueChange={(val) => setQueryState({ ...queryState, table: val, selectColumns: [], filters: [] })}
                        >
                            <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-sm font-bold">
                                <SelectValue placeholder="Selecione a fonte de dados..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                                {schema.map(s => (
                                    <SelectItem key={s.table} value={s.table} className="text-sm font-bold uppercase italic">
                                        {s.table}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {queryState.table && (
                        <>
                            {/* Step 2: Columns */}
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 fill-mode-both" style={{ animationDelay: '0.1s' }}>
                                <div className="flex items-center gap-2">
                                     <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                                        <Columns className="w-4 h-4" />
                                     </div>
                                     <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Colunas para Exibir</h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTableCols.map(col => (
                                        <button
                                            key={col}
                                            onClick={() => {
                                                const exists = queryState.selectColumns.includes(col);
                                                setQueryState(prev => ({
                                                    ...prev,
                                                    selectColumns: exists 
                                                        ? prev.selectColumns.filter(c => c !== col)
                                                        : [...prev.selectColumns, col]
                                                }))
                                            }}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border",
                                                queryState.selectColumns.includes(col)
                                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                                    : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                                            )}
                                        >
                                            {col}
                                        </button>
                                    ))}
                                    {selectedTableCols.length === 0 && <span className="text-xs text-slate-500 italic">Carregando esquema...</span>}
                                </div>
                            </div>

                            {/* Step 3: Filters */}
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 fill-mode-both" style={{ animationDelay: '0.2s' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                         <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400">
                                            <Filter className="w-4 h-4" />
                                         </div>
                                         <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Adicionar Filtros</h4>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={addFilter} className="h-8 text-[10px] uppercase font-black text-orange-400 hover:text-orange-300">
                                        <Plus className="w-3 h-3 mr-1" /> Filtro
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {queryState.filters.map((filter, idx) => (
                                        <div key={idx} className="flex gap-2 bg-white/5 p-3 rounded-xl border border-white/5 ring-1 ring-white/5">
                                            <Select 
                                                value={filter.column} 
                                                onValueChange={(val) => {
                                                    const nf = [...queryState.filters];
                                                    nf[idx].column = val;
                                                    setQueryState({ ...queryState, filters: nf });
                                                }}
                                            >
                                                <SelectTrigger className="flex-1 bg-black/40 border-none h-10 rounded-lg text-xs font-bold">
                                                    <SelectValue placeholder="Coluna" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-white/10">
                                                    {selectedTableCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>

                                            <Select 
                                                value={filter.operator} 
                                                onValueChange={(val) => {
                                                    const nf = [...queryState.filters];
                                                    nf[idx].operator = val;
                                                    setQueryState({ ...queryState, filters: nf });
                                                }}
                                            >
                                                <SelectTrigger className="w-20 bg-black/40 border-none h-10 rounded-lg text-xs font-bold text-cyan-400">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-white/10">
                                                    <SelectItem value="=">=</SelectItem>
                                                    <SelectItem value="!=">!=</SelectItem>
                                                    <SelectItem value=">">&gt;</SelectItem>
                                                    <SelectItem value="<">&lt;</SelectItem>
                                                    <SelectItem value="LIKE">LIKE</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Input 
                                                placeholder="Valor..."
                                                value={filter.value}
                                                onChange={(e) => {
                                                    const nf = [...queryState.filters];
                                                    nf[idx].value = e.target.value;
                                                    setQueryState({ ...queryState, filters: nf });
                                                }}
                                                className="flex-1 bg-black/40 border-none h-10 rounded-lg text-xs"
                                            />

                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => setQueryState(prev => ({ ...prev, filters: prev.filters.filter((_, i) => i !== idx) }))}
                                                className="h-10 w-10 text-slate-500 hover:text-rose-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Footer / Send to Editor */}
            <div className="p-6 border-t border-white/5 bg-black/40">
                <Button 
                    onClick={() => onSelectQuery(generatedSql)}
                    disabled={!queryState.table}
                    className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xs shadow-glow-cyan/10 flex gap-4 group"
                >
                    ENVIAR PARA O EDITOR
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </Card>
    );
}
