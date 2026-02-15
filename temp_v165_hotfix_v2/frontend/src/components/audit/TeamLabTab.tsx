import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HardHat, Users, Plus, Trash2, ShieldCheck, AlertCircle, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { orionApi } from '@/integrations/database';
import { cn } from '@/lib/utils';

export default function TeamLabTab() {
    const [mockTeams, setMockTeams] = useState<any[]>([]);
    const [mockEmployees, setMockEmployees] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);
    };

    const handleCreateMockEmployee = (type: 'MOD' | 'MOI') => {
        const newEmp = {
            id: `mock-emp-${Math.random().toString(36).substr(2, 9)}`,
            fullName: type === 'MOD' ? 'Pedreiro de Teste' : 'Engenheiro de Teste',
            laborType: type,
            jobFunction: { name: type === 'MOD' ? 'PEDREIRO' : 'ENGENHEIRO' }
        };
        setMockEmployees(prev => [...prev, newEmp]);
        addLog(`Mock ${type} criado: ${newEmp.fullName}`);
    };

    const handleCreateMockTeam = (type: 'MOD' | 'MOI') => {
        const newTeam = {
            id: `mock-team-${Math.random().toString(36).substr(2, 9)}`,
            name: `Equipe Teste ${type}`,
            laborType: type,
            members: []
        };
        setMockTeams(prev => [...prev, newTeam]);
        addLog(`Equipe ${type} criada: ${newTeam.name}`);
    };

    const handleSimulateMove = (empId: string, teamId: string) => {
        const emp = mockEmployees.find(e => e.id === empId);
        const team = mockTeams.find(t => t.id === teamId);

        if (!emp || !team) return;

        addLog(`Tentando mover ${emp.laborType} para equipe ${team.laborType}...`);

        if (emp.laborType !== team.laborType) {
            addLog(`ERRO: Violação de homogeneidade! ${emp.laborType} != ${team.laborType}`);
            toast.error('Bloqueado: Tipos de mão de obra incompatíveis!');
            return;
        }

        addLog(`SUCESSO: Movimentação permitida.`);
        toast.success('Movimentação validada com sucesso!');

        setMockTeams(prev => prev.map(t =>
            t.id === teamId ? { ...t, members: [...t.members, emp] } : t
        ));
        setMockEmployees(prev => prev.filter(e => e.id !== empId));
    };

    const clearAll = () => {
        setMockTeams([]);
        setMockEmployees([]);
        setLogs([]);
        toast.info('Playground resetado.');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glass-card border-primary/20 bg-primary/5">
                    <CardHeader className="p-4">
                        <CardTitle className="text-xs uppercase font-black flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Gerador de Massa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex flex-col gap-2">
                        <Button size="sm" onClick={() => handleCreateMockEmployee('MOD')} className="w-full justify-start gap-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                            <HardHat className="w-4 h-4" /> Mock Pedreiro (MOD)
                        </Button>
                        <Button size="sm" onClick={() => handleCreateMockEmployee('MOI')} className="w-full justify-start gap-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">
                            <Users className="w-4 h-4" /> Mock Engenheiro (MOI)
                        </Button>
                        <div className="h-px bg-white/5 my-1" />
                        <Button size="sm" onClick={() => handleCreateMockTeam('MOD')} className="w-full justify-start gap-2 variant-outline">
                            <ShieldCheck className="w-4 h-4 text-green-500" /> Criar Equipe MOD
                        </Button>
                        <Button size="sm" onClick={() => handleCreateMockTeam('MOI')} className="w-full justify-start gap-2 variant-outline">
                            <ShieldCheck className="w-4 h-4 text-blue-500" /> Criar Equipe MOI
                        </Button>
                        <Button size="sm" variant="ghost" onClick={clearAll} className="w-full text-red-500 hover:bg-red-500/10 mt-2">
                            <Trash2 className="w-4 h-4" /> Resetar Lab
                        </Button>
                    </CardContent>
                </Card>

                <div className="md:col-span-3 space-y-4">
                    <Card className="glass-card">
                        <CardHeader className="p-4">
                            <CardTitle className="text-sm font-black uppercase">Playground de Validação</CardTitle>
                            <CardDescription className="text-[10px]">Simulação isolada das travas de segurança de composição de equipe.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pool de Colaboradores Mock */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                                        <Fingerprint className="w-3 h-3" /> Colaboradores Criados
                                    </h4>
                                    <div className="min-h-[150px] border border-dashed border-white/10 rounded-xl p-3 flex flex-wrap gap-2 content-start">
                                        {mockEmployees.length === 0 && <p className="text-[10px] text-muted-foreground italic m-auto">Nenhum mock criado.</p>}
                                        {mockEmployees.map(emp => (
                                            <div key={emp.id} className={cn("p-2 rounded-lg border text-[10px] font-bold flex items-center gap-2 group relative transition-all animate-in fade-in zoom-in", emp.laborType === 'MOD' ? "bg-green-500/5 border-green-500/20 text-green-500" : "bg-blue-500/5 border-blue-500/20 text-blue-500")}>
                                                {emp.fullName}
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg backdrop-blur-sm transition-opacity">
                                                    <span className="text-[8px] uppercase">Arraste para uma equipe</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Equipes Mock */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground">Frentes de Serviço Destino</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {mockTeams.length === 0 && <div className="h-[150px] border border-dashed border-white/10 rounded-xl flex items-center justify-center text-[10px] text-muted-foreground italic">Crie uma equipe para testar.</div>}
                                        {mockTeams.map(team => (
                                            <div key={team.id} className="p-3 rounded-xl border border-white/10 bg-white/2 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-black">{team.name}</span>
                                                    <Badge className={team.laborType === 'MOD' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}>
                                                        {team.laborType}
                                                    </Badge>
                                                </div>
                                                <div className="min-h-[40px] border border-white/5 rounded-lg p-2 flex flex-wrap gap-1 bg-black/20">
                                                    {team.members.length === 0 && <span className="text-[8px] text-muted-foreground italic">Vazia</span>}
                                                    {team.members.map((m: any) => (
                                                        <Badge key={m.id} variant="outline" className="text-[8px] h-5">{m.fullName}</Badge>
                                                    ))}
                                                </div>
                                                {mockEmployees.length > 0 && (
                                                    <div className="flex gap-1 pt-1 overflow-x-auto pb-1">
                                                        {mockEmployees.map(e => (
                                                            <Button key={e.id} size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-primary/20" title={`Mover ${e.fullName} para esta equipe`} onClick={() => handleSimulateMove(e.id, team.id)}>
                                                                <Users className="w-3 h-3" />
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none bg-black/40">
                        <CardHeader className="p-3">
                            <CardTitle className="text-[10px] uppercase font-bold flex items-center gap-2">
                                <AlertCircle className="w-3 h-3 text-primary" /> Console de Segurança (Lab)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 font-mono text-[9px] space-y-1">
                            {logs.length === 0 && <span className="text-muted-foreground italic">Aguardando ações...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className={cn(log.includes('ERRO') ? "text-red-400" : log.includes('SUCESSO') ? "text-green-400" : "text-white/40")}>
                                    {log}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
