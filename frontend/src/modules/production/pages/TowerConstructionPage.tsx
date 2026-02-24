import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
    ArrowLeft, 
    Upload, 
    Download, 
    Table as TableIcon, 
    MapPin, 
    Weight,
    Loader2,
    Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { orionApi } from "@/integrations/orion/client";
import { selectedContextSignal } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";
import { useQueryClient } from "@tanstack/react-query";
import ConstructionImportModal from "../components/ConstructionImportModal";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const TowerConstructionPage = () => {
    useSignals();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const selectedContext = selectedContextSignal.value;
    const projectId = selectedContext?.projectId || 'all';
    
    const { toast } = useToast();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: constructionData = [], isLoading } = useQuery<any[]>({
        queryKey: ["tower-construction", projectId],
        queryFn: async () => {
            if (projectId === 'all') return [];
            const res = await orionApi.get(`/tower-construction?projectId=${projectId}`);
            return (res.data as any[]) || [];
        },
        enabled: projectId !== 'all'
    });

    const toggleSelectAll = () => {
        if (selectedIds.size === constructionData.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(constructionData.map((item: any) => item.id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        setIsDeleting(true);
        try {
            await orionApi.post('/tower-construction/delete', { ids: Array.from(selectedIds) });
            toast({ title: `${count} registro(s) removido(s)`, variant: 'default' });
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['tower-construction'] });
        } catch (err) {
            toast({ title: 'Erro ao remover registros', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden font-sans">
            <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-background/95 backdrop-blur-xl z-50">
                <div className="flex items-center gap-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black tracking-tighter text-primary uppercase italic">
                            DADOS TÉCNICOS DE PROJETO
                        </h1>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                            Engenharia & Construção
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/10 uppercase text-[10px] font-bold">
                        <Download className="w-4 h-4" /> Exportar Projeto
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/10 uppercase text-[10px] font-bold" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="w-4 h-4" /> Importar Dados
                    </Button>
                </div>
            </header>

            {selectedIds.size > 0 && (
                <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-destructive/10 border-b border-destructive/30">
                    <span className="text-sm font-bold text-destructive">
                        {selectedIds.size} torre(s) selecionada(s)
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2 uppercase text-[10px] font-bold"
                        disabled={isDeleting}
                        onClick={handleDeleteSelected}
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Remover Selecionados
                    </Button>
                </div>
            )}

            <main className="flex-1 overflow-auto p-6 bg-black/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4 bg-primary/5 border-primary/10 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><MapPin className="w-6 h-6" /></div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Coordenadas</div>
                            <div className="text-xl font-black tracking-tight">{constructionData?.length || 0} Torres locadas</div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-amber-500/5 border-amber-500/10 flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><Weight className="w-6 h-6" /></div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Peso Total Estrutura</div>
                            <div className="text-xl font-black tracking-tight">-- Ton</div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-sky-500/5 border-sky-500/10 flex items-center gap-4">
                        <div className="p-3 bg-sky-500/10 rounded-xl text-sky-500"><TableIcon className="w-6 h-6" /></div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Vãos de Projeto</div>
                            <div className="text-xl font-black tracking-tight">-- m médio</div>
                        </div>
                    </Card>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/40 overflow-hidden shadow-2xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-white/5 border-b border-white/5 hover:bg-white/5">
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={constructionData.length > 0 && selectedIds.size === constructionData.length}
                                        onCheckedChange={toggleSelectAll}
                                        className="border-white/20"
                                    />
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-primary">Seq</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-primary">ID Torre</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest">Vão Vante (m)</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest">Elevação</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest">Latitude</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest">Longitude</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest">Zona</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-sky-500">Vol Conc. (m³)</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-amber-500">Peso Estru. (Ton)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-64 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" />
                                    </TableCell>
                                </TableRow>
                            ) : constructionData?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-64 text-center text-muted-foreground italic">
                                        Nenhum dado de projeto importado para este projeto.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                constructionData?.map((item: any) => (
                                    <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors font-mono text-xs">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(item.id)}
                                                onCheckedChange={() => toggleSelect(item.id)}
                                                className="border-white/20"
                                            />
                                        </TableCell>
                                        <TableCell className="font-bold text-primary">{item.sequencia || "-"}</TableCell>
                                        <TableCell className="font-bold text-primary">{item.towerId}</TableCell>
                                        <TableCell>{item.metadata?.distancia_vao || "-"}</TableCell>
                                        <TableCell>{item.metadata?.elevacao || "-"}</TableCell>
                                        <TableCell>{item.metadata?.latitude || "-"}</TableCell>
                                        <TableCell>{item.metadata?.longitude || "-"}</TableCell>
                                        <TableCell>{item.metadata?.zona || "-"}</TableCell>
                                        <TableCell className="text-sky-500/80">{item.metadata?.peso_concreto || "-"}</TableCell>
                                        <TableCell className="text-amber-500/80">{item.metadata?.peso_estrutura || "-"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>

            <ConstructionImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => {
                    setIsImportModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["tower-construction"] });
                }} 
                projectId={projectId} 
            />
        </div>
    );
};

export default TowerConstructionPage;
