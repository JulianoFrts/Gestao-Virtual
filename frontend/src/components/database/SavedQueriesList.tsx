import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, Trash2, Play, Save, Database } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

interface SavedQuery {
    id: string;
    name: string;
    query: string;
    createdAt: number;
}

interface SavedQueriesListProps {
    currentQuery: string;
    onSelect: (query: string) => void;
}

export function SavedQueriesList({ currentQuery, onSelect }: SavedQueriesListProps) {
    const [queries, setQueries] = useState<SavedQuery[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newQueryName, setNewQueryName] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('gv_saved_queries');
        if (saved) {
            try {
                setQueries(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved queries", e);
            }
        }
    }, []);

    const saveQuery = () => {
        if (!newQueryName.trim()) {
            toast.error("Digite um nome para a query");
            return;
        }
        if (!currentQuery.trim()) {
            toast.error("O editor de query está vazio");
            return;
        }

        const newQuery: SavedQuery = {
            id: crypto.randomUUID(),
            name: newQueryName,
            query: currentQuery,
            createdAt: Date.now()
        };

        const updated = [newQuery, ...queries];
        setQueries(updated);
        localStorage.setItem('gv_saved_queries', JSON.stringify(updated));
        
        setNewQueryName('');
        setIsDialogOpen(false);
        toast.success("Query salva com sucesso!");
    };

    const deleteQuery = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = queries.filter(q => q.id !== id);
        setQueries(updated);
        localStorage.setItem('gv_saved_queries', JSON.stringify(updated));
        toast.info("Query removida");
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Queries Salvas</h3>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-dashed">
                            <Save className="w-3 h-3" />
                            Salvar Atual
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Salvar Query</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nome
                                </Label>
                                <Input
                                    id="name"
                                    value={newQueryName}
                                    onChange={(e) => setNewQueryName(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Ex: Buscar Usuários Ativos"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={saveQuery}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <ScrollArea className="w-full whitespace-nowrap pb-2">
                <div className="flex space-x-2">
                    {queries.length === 0 && (
                        <div className="text-xs text-muted-foreground italic px-2 py-1">
                            Nenhuma query salva.
                        </div>
                    )}
                    
                    {queries.map((q) => (
                        <div
                            key={q.id}
                            onClick={() => onSelect(q.query)}
                            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/50 cursor-pointer transition-all min-w-[150px] justify-between"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Database className="w-3 h-3 text-cyan-500 shrink-0" />
                                <span className="text-xs font-medium truncate max-w-[120px]">{q.name}</span>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-500"
                                onClick={(e) => deleteQuery(q.id, e)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
