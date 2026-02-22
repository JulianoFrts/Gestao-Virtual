import React, { useState, useEffect } from 'react';
import { Access } from '@/components/auth/Access';
import { Plus, X, Save, Edit2, Loader2, Shield, Info, Trash2, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { getRoleStyle, getRoleLabel, STANDARD_ROLES, STANDARD_MODULES } from '@/utils/roleUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { localApi } from '@/integrations/orion/client';
import { useAuth } from '@/contexts/AuthContext';
import { isProtectedSignal, can } from '@/signals/authSignals';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import SUDocumentHub from '@/components/su/SUDocumentHub';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Level {
    id: string;
    name: string;
    rank: number;
    is_system: boolean;
}

interface Module {
    id: string;
    code: string;
    name: string;
    category: string;
}

export default function CustomSU() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [levels, setLevels] = useState<Level[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [matrix, setMatrix] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingLevel, setIsAddingLevel] = useState(false);
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const [newLevel, setNewLevel] = useState({ name: '', rank: 0 });
    const [newModule, setNewModule] = useState({ code: '', name: '', category: 'Geral' });

    const currentUserLevel = levels.find(l => l.name === (profile?.role || '').toUpperCase());
    const currentUserRank = currentUserLevel?.rank || 0;
    const isSuperAdmin = isProtectedSignal.value;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [lRes, mRes, mxRes] = await Promise.all([
                localApi.from('permission_levels').select('*').order('rank', { ascending: false }),
                localApi.from('permission_modules').select('*').order('category', { ascending: true }),
                localApi.from('permission_matrix').select('*')
            ]);

            if (lRes.data) setLevels(lRes.data);
            if (mRes.data) setModules(mRes.data);

            const mxMap: Record<string, boolean> = {};
            (mxRes.data as any[])?.forEach(item => {
                mxMap[`${item.level_id}:${item.module_id}`] = item.is_granted || false;
            });
            setMatrix(mxMap);
        } catch (error) {
            console.error('Error fetching SU data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePermission = (levelId: string, moduleId: string) => {
        const key = `${levelId}:${moduleId}`;
        setMatrix(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const toggleRow = (moduleId: string, checked: boolean) => {
        const newMatrix = { ...matrix };
        levels.forEach(level => {
            if (level.rank < 1000) { // Não altera SuperAdminGod
                newMatrix[`${level.id}:${moduleId}`] = checked;
            }
        });
        setMatrix(newMatrix);
    };

    const toggleColumn = (levelId: string, checked: boolean) => {
        const newMatrix = { ...matrix };
        modules.forEach(module => {
            newMatrix[`${levelId}:${module.id}`] = checked;
        });
        setMatrix(newMatrix);
    };

    const syncModulesAndLevels = async () => {
        setIsSaving(true);
        try {
            let changes = 0;
            // 1. Sync Modules
            const existingCodes = modules.map(m => m.code);
            const missingModules = STANDARD_MODULES.filter(sm => !existingCodes.includes(sm.code));

            if (missingModules.length > 0) {
                const { error } = await localApi.from('permission_modules').insert(missingModules);
                if (error) throw error;
                changes += missingModules.length;
            }

            // 2. Sync Levels
            const existingLevels = levels.map(l => l.name);
            const missingLevels = STANDARD_ROLES.filter(sr => !existingLevels.includes(sr.name)).map(r => ({
                name: r.name,
                rank: r.rank,
                is_system: true
            }));

            if (missingLevels.length > 0) {
                const { error } = await localApi.from('permission_levels').insert(missingLevels);
                if (error) throw error;
                changes += missingLevels.length;
            }

            if (changes === 0) {
                toast({ title: 'Tudo em dia!', description: 'Todos os módulos e níveis já estão na matriz.' });
                return;
            }

            toast({
                title: 'Sincronização concluída',
                description: `${changes} novos itens foram adicionados à matriz.`
            });

            fetchData();
        } catch (error: any) {
            toast({ title: 'Erro na sincronização', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveMatrix = async () => {
        if (isSaving) return;

        console.log('[CustomSU] Iniciando salvamento da matriz...');
        setIsSaving(true);
        try {
            const updates = Object.entries(matrix).map(([key, isGranted]) => {
                const [levelId, moduleId] = key.split(':');
                return {
                    levelId,
                    moduleId,
                    isGranted,
                };
            });

            // Usando POST no endpoint dedicado, não upsert genérico!
            const response = await localApi.post('/permission_matrix', updates);
            
            if (response.error) throw response.error;

            const responseData = response.data as any;
            const taskId = responseData?.taskId || responseData?.id;

            if (taskId) {
                toast({ title: 'Processando...', description: 'Aguarde a conclusão do salvamento em segundo plano.' });

                // Polling de status usando a localApi wrapper
                let isDone = false;
                let attempts = 0;

                while (!isDone && attempts < 60) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    attempts++;

                    try {
                        const statusRes = await localApi.get(`/task_queue/${taskId}`);
                        const statusJson = statusRes.data as any;
                        const status = statusJson?.status;

                        if (status === 'completed') {
                            isDone = true;
                            toast({ title: 'Matriz atualizada', description: 'Todas as permissões foram salvas com sucesso!' });
                        } else if (status === 'failed') {
                            isDone = true;
                            throw new Error(statusJson?.error || 'Falha no processamento da tarefa');
                        }
                    } catch (pollErr) {
                        console.error('Polling error:', pollErr);
                    }
                }

                if (!isDone) {
                    toast({ title: 'Aviso', description: 'O processamento está demorando mais que o esperado, mas continuará rodando.' });
                }
            } else {
                toast({ title: 'Matriz atualizada', description: 'Todas as permissões foram salvas com sucesso.' });
            }
        } catch (error: any) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddLevel = async () => {
        try {
            const { error } = await localApi.from('permission_levels').insert([newLevel]);
            if (error) throw error;
            toast({ title: 'Nível adicionado', description: `${newLevel.name} agora faz parte da hierarquia.` });
            setIsAddingLevel(false);
            fetchData();
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    };

    const handleAddModule = async () => {
        try {
            const { error } = await localApi.from('permission_modules').insert([newModule]);
            if (error) throw error;
            toast({ title: 'Módulo adicionado', description: `${newModule.name} disponível para configuração.` });
            setIsAddingModule(false);
            fetchData();
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    };

    const handleDeleteModules = async (ids: string[]) => {
        if (!confirm(`Deseja realmente excluir ${ids.length} módulo(s)? Esta ação é irreversível.`)) return;

        setIsDeleting(true);
        try {
            const { error } = await localApi.from('permission_modules').delete().in('id', ids);
            if (error) throw error;

            toast({ title: 'Módulos removidos', description: 'Os itens foram excluídos com sucesso.' });
            setSelectedModuleIds([]);
            fetchData();
        } catch (error: any) {
            toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleModuleSelection = (id: string) => {
        setSelectedModuleIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAllModules = (checked: boolean) => {
        if (checked) {
            setSelectedModuleIds(modules.map(m => m.id));
        } else {
            setSelectedModuleIds([]);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
                <div className="w-full xl:w-auto">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Shield className="w-8 h-8 text-primary" />
                        Custom SU <Badge variant="secondary" className="ml-2">Matriz de Abas</Badge>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Mapeamento de permissões por Abas do Site e Níveis Hierárquicos.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto pb-2 xl:pb-0">
                    <Access auth="custom_su.manage" mode="hide">
                        <>
                            <Button variant="outline" size="sm" onClick={syncModulesAndLevels} className="flex-1 min-w-[140px]">
                                <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar Sistema
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsAddingLevel(true)} className="flex-1 min-w-[120px]">
                                <Plus className="w-4 h-4 mr-2" /> Nível
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsAddingModule(true)} className="flex-1 min-w-[120px]">
                                <Plus className="w-4 h-4 mr-2" /> Módulo
                            </Button>
                        </>
                    </Access>
                    {selectedModuleIds.length > 0 && isSuperAdmin && (
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteModules(selectedModuleIds)} disabled={isDeleting} className="flex-1 min-w-[120px]">
                            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                            Excluir ({selectedModuleIds.length})
                        </Button>
                    )}
                    <Access auth="custom_su.manage" mode="hide">
                        <Button className="gradient-primary flex-1 min-w-[140px]" size="sm" onClick={handleSaveMatrix} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Matriz
                        </Button>
                    </Access>
                </div>
            </div>

            <Tabs defaultValue="matrix" className="w-full">
                <TabsList className="glass-card mb-6 p-1 border-white/5 w-full flex-wrap h-auto justify-start gap-2">
                    <TabsTrigger value="matrix" className="flex-1 min-w-[200px] gap-2 px-8">
                        <Save className="w-4 h-4" /> Matriz de Permissões
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 min-w-[200px] gap-2 px-8">
                        <FileText className="w-4 h-4" /> Repositório por Nível
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="matrix" className="space-y-6">
                    <Card className="glass-card overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b py-4 shadow-sm border-white/5">
                            <div className="flex items-center justify-between">
                                <CardDescription className="flex items-center gap-2 font-bold text-muted-foreground w-full">
                                    <Info className="w-4 h-4" /> Matriz: Abas do Site (Col 1) x Níveis (Col 2+)
                                </CardDescription>
                                <Trash2 className="w-4 h-4 text-muted-foreground/50 hover:text-destructive cursor-pointer transition-colors" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="relative w-full overflow-auto max-h-[70vh] custom-scrollbar">
                                <table className="w-full caption-bottom text-sm">
                                <TableHeader className="sticky top-0 z-40 bg-[#0B1221] shadow-sm border-b border-white/5">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[350px] border-r-2 border-primary/20 sticky left-0 z-50 bg-[#0B1221] shadow-[4px_0_10px_-5px_rgba(0,0,0,0.5)]">
                                            <div className="flex items-center  gap-3">
                                                <Checkbox
                                                    checked={selectedModuleIds.length === modules.length && modules.length > 0}
                                                    onCheckedChange={(checked) => toggleAllModules(!!checked)}
                                                    className="border-primary/40"
                                                    disabled={!isSuperAdmin}
                                                />
                                                <span className="font-black text-xs uppercase tracking-tighter text-muted-foreground">Aba / Funcionalidade</span>
                                            </div>
                                        </TableHead>
                                        {levels.map(level => {
                                            const isGodLevel = level.rank >= 1000;
                                            const allChecked = modules.length > 0 && modules.every(m => matrix[`${level.id}:${m.id}`]);

                                            return (
                                                <TableHead key={level.id} className="text-center min-w-[120px] border-r border-white/5 bg-[#0B1221]">
                                                    <div className="flex flex-col items-center gap-3 py-4">
                                                        <div className={cn(
                                                            "px-3 py-1 rounded-full border text-[10px] font-black tracking-wider uppercase transition-all duration-300",
                                                            getRoleStyle(level.name)
                                                        )}>
                                                            {level.name.replace('_', ' ')}
                                                        </div>
                                                        <span className="text-[9px] text-primary/40 font-mono tracking-widest font-bold">LVL {level.rank}</span>

                                                        <div className="flex flex-col items-center gap-1 w-full pt-2 border-t border-primary/10">
                                                            <div className="flex items-center gap-2">
                                                                <Checkbox
                                                                    checked={isGodLevel || allChecked}
                                                                    onCheckedChange={(checked) => toggleColumn(level.id, !!checked)}
                                                                    disabled={isGodLevel || (level.rank >= currentUserRank && !isSuperAdmin)}
                                                                    className="w-3.5 h-3.5 border-primary/30 data-[state=checked]:bg-primary"
                                                                />
                                                                <span className="text-[9px] font-black text-muted-foreground/60 uppercase">Acesso</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.from(new Set(modules.map(m => m.category))).map(category => (
                                        <React.Fragment key={category}>
                                            <TableRow className="bg-primary/10 hover:bg-primary/15 border-y-2 border-primary/20">
                                                <TableCell colSpan={levels.length + 1} className="py-2.5 px-6 font-black text-primary text-xs uppercase tracking-[0.2em] shadow-inner">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                        {category}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {modules.filter(m => m.category === category).map(module => (
                                                <TableRow key={module.id} className="hover:bg-white/2 transition-colors border-b border-white/5">
                                                    <TableCell className="border-r-2 border-primary/20 p-0 sticky left-0 z-10 bg-background/80 backdrop-blur-sm">
                                                        <div className="flex items-center justify-between gap-3 group/row px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <Checkbox
                                                                    checked={selectedModuleIds.includes(module.id)}
                                                                    onCheckedChange={() => toggleModuleSelection(module.id)}
                                                                    className="w-4 h-4 border-primary/30"
                                                                    disabled={!isSuperAdmin}
                                                                />
                                                                <Checkbox
                                                                    checked={levels.every(l => l.rank >= 1000 || matrix[`${l.id}:${module.id}`])}
                                                                    onCheckedChange={(checked) => toggleRow(module.id, !!checked)}
                                                                    className="w-4 h-4 border-primary/30 data-[state=checked]:bg-primary"
                                                                    disabled={!isSuperAdmin && levels.some(l => l.rank >= currentUserRank)}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm text-foreground/90 leading-none mb-1">{module.name}</span>
                                                                    <code className="text-[9px] text-muted-foreground/60 font-mono tracking-tight uppercase">{module.code}</code>
                                                                </div>
                                                            </div>
                                                            {isSuperAdmin && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 opacity-0 group-hover/row:opacity-100 text-destructive hover:bg-destructive/10 transition-all scale-90 hover:scale-100"
                                                                    onClick={() => handleDeleteModules([module.id])}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    {levels.map(level => {
                                                        const isGranted = matrix[`${level.id}:${module.id}`] || false;
                                                        const isGodLevel = level.rank >= 1000;
                                                        const isLockedForUser = (level.rank >= currentUserRank && !isSuperAdmin);

                                                        return (
                                                            <TableCell key={level.id} className="text-center border-r border-white/5 p-0">
                                                                <div
                                                                    className={cn(
                                                                        "flex items-center justify-center px-2 py-4 h-full transition-colors",
                                                                        (isGranted || isGodLevel) && "bg-primary/5",
                                                                        (isGodLevel || isLockedForUser) && "bg-primary/10"
                                                                    )}
                                                                >
                                                                    <Checkbox
                                                                        checked={isGodLevel || isGranted}
                                                                        disabled={isGodLevel || isLockedForUser}
                                                                        className={cn(
                                                                            "w-5 h-5 transition-transform duration-200 hover:scale-110",
                                                                            (isGodLevel || isLockedForUser) && "bg-primary border-primary opacity-100 ring-2 ring-primary/20"
                                                                        )}
                                                                        onCheckedChange={() => togglePermission(level.id, module.id)}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents">
                    <SUDocumentHub />
                </TabsContent>
            </Tabs>

            {/* Add Level Dialog */}
            <Dialog open={isAddingLevel} onOpenChange={setIsAddingLevel}>
                <DialogContent className="w-[95%] max-w-md mx-auto h-auto max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Novo Nível Hierárquico</DialogTitle>
                        <DialogDescription>Escolha um nível padrão ou crie um personalizado.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Sugestões do Sistema</Label>
                            <Select onValueChange={(val) => {
                                const role = STANDARD_ROLES.find(r => r.name === val);
                                if (role) setNewLevel({ name: role.name, rank: role.rank });
                            }}>
                                <SelectTrigger className="industrial-input">
                                    <SelectValue placeholder="Escolher um cargo padrão..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {STANDARD_ROLES.map(r => (
                                        <SelectItem key={r.name} value={r.name}>
                                            <div className="flex items-center justify-between w-full gap-4">
                                                <span>{getRoleLabel(r.name)}</span>
                                                <Badge variant="outline" className="text-[9px] opacity-50">Rank {r.rank}</Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative py-2 rotate-0">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-background px-2 text-muted-foreground">Ou Manual</span></div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="level-name">Nome do Nível</Label>
                            <Input id="level-name" placeholder="EX: GERENTE_REGIONAL" value={newLevel.name} onChange={e => setNewLevel({ ...newLevel, name: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="level-rank">Rank (Poder)</Label>
                            <Input id="level-rank" type="number" placeholder="EX: 850" value={newLevel.rank} onChange={e => setNewLevel({ ...newLevel, rank: parseInt(e.target.value) })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddingLevel(false)}>Cancelar</Button>
                        <Button className="gradient-primary" onClick={handleAddLevel}>Criar Nível</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Module Dialog */}
            <Dialog open={isAddingModule} onOpenChange={setIsAddingModule}>
                <DialogContent className="w-[95%] max-w-md mx-auto h-auto max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nova Aba / Módulo</DialogTitle>
                        <DialogDescription>Selecione uma funcionalidade padrão ou adicione manualmente.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Funcionalidades Disponíveis</Label>
                            <Select onValueChange={(val) => {
                                const mod = STANDARD_MODULES.find(m => m.code === val);
                                if (mod) setNewModule({ code: mod.code, name: mod.name, category: mod.category });
                            }}>
                                <SelectTrigger className="industrial-input">
                                    <SelectValue placeholder="Escolher funcionalidade..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {STANDARD_MODULES.filter(m => !modules.some(mod => mod.code === m.code)).map(m => (
                                        <SelectItem key={m.code} value={m.code}>
                                            <div className="flex flex-col">
                                                <span>{m.name}</span>
                                                <span className="text-[10px] opacity-60">CAT: {m.category}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative py-2 rotate-0">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-background px-2 text-muted-foreground">Ou Manual</span></div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="module-name">Nome Amigável</Label>
                            <Input id="module-name" placeholder="EX: Excluir Foto de Ponto" value={newModule.name} onChange={e => setNewModule({ ...newModule, name: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="module-code">Código (ID Técnico)</Label>
                            <Input id="module-code" placeholder="EX: clock.delete_photo" value={newModule.code} onChange={e => setNewModule({ ...newModule, code: e.target.value.toLowerCase() })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="module-category">Categoria</Label>
                            <Input id="module-category" placeholder="EX: Ponto Eletrônico" value={newModule.category} onChange={e => setNewModule({ ...newModule, category: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddingModule(false)}>Cancelar</Button>
                        <Button className="gradient-primary" onClick={handleAddModule}>Criar Módulo</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
