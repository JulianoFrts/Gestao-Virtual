import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import { 
    ShieldCheck, 
    AlertTriangle, 
    TrendingDown, 
    Activity,
    Clock,
    CheckCircle2,
    Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import GAPOValidationList from './GAPOValidationList';
import { cn } from '@/lib/utils';

interface GAPOExecutiveOverviewProps {
    projectId?: string;
    stages?: any[];
    records?: any[];
    pendingAudits?: number;
}

export default function GAPOExecutiveOverview({ projectId, pendingAudits = 0 }: GAPOExecutiveOverviewProps) {
    
    // 1. Data for Governance Radar
    const radarData = useMemo(() => [
        { subject: 'Qualidade', A: 85, fullMark: 100 },
        { subject: 'Segurança', A: 92, fullMark: 100 },
        { subject: 'Prazo', A: 78, fullMark: 100 },
        { subject: 'Custos', A: 65, fullMark: 100 },
        { subject: 'Documentação', A: 88, fullMark: 100 },
        { subject: 'Compliance', A: 95, fullMark: 100 },
    ], []);

    // 2. Metrics for Executive Cards
    const metrics = useMemo(() => [
        {
            title: "Score de Governança",
            value: "84/100",
            sub: "+4% vs mês anterior",
            icon: ShieldCheck,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            detail: "Índice de conformidade técnica e administrativa."
        },
        {
            title: "Exposição a Risco",
            value: "MÉDIA",
            sub: "3 alertas críticos",
            icon: AlertTriangle,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            detail: "Baseado em atrasos e falhas de documentação."
        },
        {
            title: "Eficiência Líquida",
            value: "92%",
            sub: "Alta performance",
            icon: Activity,
            color: "text-sky-500",
            bg: "bg-sky-500/10",
            detail: "Relação entre avanço físico e esforço HH."
        },
        {
            title: "Status de Auditoria",
            value: `${pendingAudits}`,
            sub: "Pendentes",
            icon: Clock,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            detail: "Processos aguardando validação pela gerência."
        }
    ], [pendingAudits]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m, idx) => (
                    <Card key={idx} className="glass-card border-white/5 group hover:border-primary/20 transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("p-2 rounded-xl", m.bg)}>
                                    <m.icon className={cn("w-5 h-5", m.color)} />
                                </div>
                                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-white/10 uppercase">
                                    GAPO V3
                                </Badge>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">{m.title}</h3>
                            <div className="text-3xl font-black tracking-tight mb-1">{m.value}</div>
                            <p className={cn("text-[10px] font-bold mb-3", m.color)}>{m.sub}</p>
                            <div className="pt-3 border-t border-white/5">
                                <p className="text-[9px] text-muted-foreground leading-relaxed italic line-clamp-2">
                                    {m.detail}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Middle Section: Insights & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Governance Radar Chart */}
                <Card className="glass-card lg:col-span-1 border-white/5 overflow-hidden">
                    <CardHeader className="pb-2 border-b border-white/5 bg-white/1">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Lock className="w-4 h-4 text-emerald-500" />
                            Radar de Governança
                        </CardTitle>
                        <CardDescription className="text-[10px]">Métricas de conformidade multipropósito.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 flex items-center justify-center">
                        <div className="h-[280px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                    <PolarAngleAxis 
                                        dataKey="subject" 
                                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} 
                                    />
                                    <Radar
                                        name="Performance"
                                        dataKey="A"
                                        stroke="#f59e0b"
                                        fill="#f59e0b"
                                        fillOpacity={0.4}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Action Area: Validation List */}
                <Card className="glass-card lg:col-span-2 border-white/5">
                    <CardHeader className="pb-2 border-b border-white/5 bg-white/1">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-amber-500" />
                                    Prioridades de Auditoria
                                </CardTitle>
                                <CardDescription className="text-[10px]">Itens que necessitam de intervenção técnica imediata.</CardDescription>
                            </div>
                            <Badge className="bg-primary text-[10px] font-black">SLA: 24h</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <GAPOValidationList projectId={projectId} />
                    </CardContent>
                </Card>

            </div>

            {/* Bottom Section: Compliance Ticker / Additional Info */}
            <div className="p-4 rounded-2xl border border-white/5 bg-white/1 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest">Selo GAPO Premium</h4>
                        <p className="text-[10px] text-muted-foreground">Esta obra está operando dentro dos padrões de conformidade técnica nível A1.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest">
                        Última Auditoria: Hoje, 14:20
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
                        Status: Auditado
                    </div>
                </div>
            </div>
        </div>
    );
}
