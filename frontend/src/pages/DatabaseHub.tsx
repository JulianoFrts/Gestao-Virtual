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

// --- Refactored Main Page ---
import { SqlEditor } from '@/components/database/SqlEditor';
import { SqlResults } from '@/components/database/SqlResults';
import { SavedQueriesList } from '@/components/database/SavedQueriesList';
import { SchemaDiagram } from '@/components/database/SchemaDiagram';
import { useSqlRunner } from '@/hooks/useSqlRunner';

const SqlConsole = () => {
    const [query, setQuery] = useState('SELECT * FROM "users" LIMIT 100;');
    const { loading, error, results, executeQuery } = useSqlRunner();

    const handleRun = () => executeQuery(query);

    return (
        <div className="flex flex-col h-full gap-4">
             {/* Top: Saved Queries & Editor */}
             <div className="flex-1 min-h-0 flex flex-col gap-2">
                <SavedQueriesList currentQuery={query} onSelect={setQuery} />
                
                <div className="flex-1 flex flex-col min-h-0 relative">
                    {/* Toolbar */}
                    <div className="absolute top-2 right-2 z-10">
                        <Button
                            size="sm"
                            onClick={handleRun}
                            disabled={loading}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2 shadow-lg hover:shadow-cyan-500/20"
                        >
                            <Play className="w-4 h-4" />
                            Executar (F5)
                        </Button>
                    </div>

                    <SqlEditor 
                        value={query} 
                        onChange={setQuery} 
                        className="flex-1 min-h-[300px]"
                    />
                </div>
             </div>

             {/* Bottom: Results */}
             <div className="h-[350px] flex flex-col bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="flex items-center p-2 bg-muted/30 border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground gap-2">
                    <Layout className="w-4 h-4" />
                    Resultados
                    {results && results.length > 0 && (
                        <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {results.length} registros
                        </span>
                    )}
                </div>
                <div className="flex-1 relative overflow-hidden">
                    <SqlResults loading={loading} error={error} results={results} />
                </div>
             </div>
        </div>
    );
};

export default function DatabaseHub() {
    return (
        <div className="p-6 h-[calc(100vh-20px)] flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/30">
                        <Database className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                            Database Hub
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full border border-cyan-500/20 font-mono">v2.0</span>
                        </h1>
                        <p className="text-sm text-muted-foreground">Gerenciamento Avançado de Dados & Schema</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 bg-background rounded-xl border border-border shadow-sm overflow-hidden">
                <Tabs defaultValue="console" className="flex-1 flex flex-col min-h-0">
                    <div className="border-b border-border bg-card/50 px-4 py-2">
                        <TabsList className="bg-muted p-1 rounded-lg">
                            <TabsTrigger value="console" className="gap-2 px-4">
                                <Code2 className="w-4 h-4" />
                                SQL Console
                            </TabsTrigger>
                            <TabsTrigger value="diagram" className="gap-2 px-4">
                                <Layout className="w-4 h-4" />
                                Diagram Designer
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="console" className="flex-1 mt-0 p-4 h-full overflow-hidden">
                        <SqlConsole />
                    </TabsContent>

                    <TabsContent value="diagram" className="flex-1 mt-0 h-full overflow-hidden bg-zinc-950">
                        <SchemaDiagram />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
