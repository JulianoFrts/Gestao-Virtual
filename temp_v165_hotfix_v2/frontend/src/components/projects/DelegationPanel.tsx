
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, Trash2, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { orionApi } from '@/integrations/orion/client';
import { useToast } from '@/hooks/use-toast';

interface Delegation {
    id: string;
    jobFunction: { name: string };
    module: { name: string; code: string };
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

interface JobFunction {
    id: string;
    name: string;
}

interface Module {
    id: string;
    name: string;
    code: string;
}

export function DelegationPanel({ projectId }: { projectId: string }) {
    const [delegations, setDelegations] = useState<Delegation[]>([]);
    const [functions, setFunctions] = useState<JobFunction[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const [selection, setSelection] = useState({
        jobFunctionId: '',
        moduleId: ''
    });

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [delRes, funcRes, modRes] = await Promise.all([
                orionApi.get(`/projects/${projectId}/delegations`),
                orionApi.get(`/job_functions?projectId=${projectId}`),
                orionApi.get(`/permission_modules?projectId=${projectId}`)
            ]);

            setDelegations((delRes.data as Delegation[]) || []);
            setFunctions((funcRes.data as JobFunction[]) || []);
            setModules((modRes.data as Module[]) || []);
        } catch (error) {
            console.error('Erro ao carregar dados de delegação:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGrant = async () => {
        if (!selection.jobFunctionId || !selection.moduleId) return;

        setSaving(true);
        try {
            await orionApi.post(`/projects/${projectId}/delegations`, {
                ...selection,
                canCreate: true,
                canRead: true,
                canUpdate: true,
                canDelete: true
            });

            toast({ title: 'Poderes Delegados', description: 'A função agora possui acesso administrativo ao módulo.' });
            fetchData();
            setSelection({ jobFunctionId: '', moduleId: '' });
        } catch (error) {
            toast({ title: 'Erro', description: 'Não foi possível delegar a permissão.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleRevoke = async (id: string) => {
        try {
            await orionApi.delete(`/projects/${projectId}/delegations/${id}`);
            toast({ title: 'Permissão Revogada' });
            setDelegations(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            toast({ title: 'Erro', description: 'Não foi possível revogar a permissão.', variant: 'destructive' });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <Card className="glass-card mt-6 border-l-4 border-l-blue-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Delegação de Poderes Extras (PM)
                </CardTitle>
                <CardDescription>
                    Atribua poderes de gestão para cargos específicos neste projeto.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
                    <Info className="w-5 h-5 shrink-0" />
                    <p>
                        Aqui você pode delegar o controle de módulos (ex: Gestão de Funcionários) para cargos como
                        <strong> RH</strong> ou <strong> Administrativo</strong>, permitindo que eles ajudem na gestão da obra.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Escolha o Cargo</label>
                        <Select value={selection.jobFunctionId} onValueChange={id => setSelection(prev => ({ ...prev, jobFunctionId: id }))}>
                            <SelectTrigger className="industrial-input">
                                <SelectValue placeholder="Selecione o cargo" />
                            </SelectTrigger>
                            <SelectContent className="glass-card">
                                {functions.map(f => (
                                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Pacote de Poderes (Módulo)</label>
                        <Select value={selection.moduleId} onValueChange={id => setSelection(prev => ({ ...prev, moduleId: id }))}>
                            <SelectTrigger className="industrial-input">
                                <SelectValue placeholder="Selecione o módulo" />
                            </SelectTrigger>
                            <SelectContent className="glass-card">
                                {modules.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleGrant} disabled={!selection.jobFunctionId || !selection.moduleId || saving} className="gradient-primary text-white">
                        {saving ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                        Delegar Poderes
                    </Button>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-1">Poderes Ativos</h3>
                    {delegations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-lg border border-dashed border-white/10">
                            Nenhuma delegação ativa para este projeto.
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {delegations.map(del => (
                                <div key={del.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">{del.jobFunction?.name}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">{del.module?.name}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-500 bg-emerald-500/5">FULL ACCESS</Badge>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRevoke(del.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
