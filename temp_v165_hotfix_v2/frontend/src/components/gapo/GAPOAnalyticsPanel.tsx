import React from 'react';
import { 
    Activity, 
    Zap, 
    Users, 
    ShieldAlert,
    Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Bar,
    Line,
    ComposedChart
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useGetApiV1AnalyticsPerformance, useGetApiV1AnalyticsProductivity, useGetApiV1AnalyticsTeams } from '@/integrations/orion/generated/analytics/analytics';
import { useGAPOAnalytics } from '@/hooks/useGAPOAnalytics';
import { WorkStage } from '@/hooks/useWorkStages';
import { TimeRecord } from '@/hooks/useTimeRecords';
import { cn } from '@/lib/utils';

interface GAPOAnalyticsPanelProps {
    projectId?: string;
    stages?: WorkStage[];
    records?: TimeRecord[];
}

export default function GAPOAnalyticsPanel({ projectId, stages = [], records = [] }: GAPOAnalyticsPanelProps) {

    // Backend Hooks
    const { data: metrics } = useGetApiV1AnalyticsPerformance(
        { projectId: projectId || '' }, 
        { query: { enabled: !!projectId } }
    );
    const { data: productivityData } = useGetApiV1AnalyticsProductivity(
        { projectId: projectId || '' }, 
        { query: { enabled: !!projectId } }
    );
    const { data: teamsData } = useGetApiV1AnalyticsTeams(
        { projectId: projectId || '' }, 
        { query: { enabled: !!projectId } }
    );

    const { physicalProgressData, hhEfficiency, sCurveData: localCurveData } = useGAPOAnalytics(stages, records);

    // Merge backend data with local calculations fallback
    const displayCurveData = (productivityData && productivityData.length > 0) ? productivityData : localCurveData;
    
    // Summary Cards Data
    const summaryCards = [
        {
            title: "Avanço Físico",
            value: (physicalProgressData.totalActual * 100) > 0 ? `${(physicalProgressData.totalActual * 100).toFixed(1)}%` : "0.0%",
            description: "Média ponderada por peso",
            icon: Activity,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            title: "Eficiência HH",
            value: hhEfficiency > 0 ? hhEfficiency.toFixed(2) : "0.00",
            description: "Avanço % / Homem-Hora",
            icon: Zap,
            color: "text-sky-500",
            bg: "bg-sky-500/10"
        },
        {
            title: "Equipes Ativas",
            value: teamsData?.length ?? "0",
            description: "Canteiros vinculados",
            icon: Users,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            title: "Performance (SPI)",
            value: metrics?.spi ? metrics.spi.toFixed(2) : "N/D",
            description: metrics?.spi && metrics.spi < 1 ? "Abaixo da meta" : "Dentro do prazo",
            icon: ShieldAlert,
            color: metrics?.spi && metrics.spi < 1 ? "text-rose-500" : "text-emerald-500",
            bg: metrics?.spi && metrics.spi < 1 ? "bg-rose-500/10" : "bg-emerald-500/10"
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Performance & KPIs
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium italic">Análise em tempo real de produtividade e metas.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-8 px-3 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">
                        <ClockIcon className="w-3 h-3 text-muted-foreground" />
                        Este Mês
                    </div>
                </div>
            </div>

            {/* Summary Grid with Weather & Health */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card, idx) => (
                    <Card key={idx} className="glass-card border-white/5 overflow-hidden group hover:border-primary/20 transition-all">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform duration-500", card.bg)}>
                                <card.icon className={cn("w-6 h-6", card.color)} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-0.5">{card.title}</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black tracking-tight">{card.value}</span>
                                    {idx === 0 && <span className="text-[10px] text-emerald-500 font-bold">+2.4%</span>}
                                </div>
                                <span className="text-[9px] font-medium text-muted-foreground italic">{card.description}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content Areas */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <Card className="glass-card border-white/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-amber-500" />
                                    Curva S de Avanço Físico
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={displayCurveData}>
                                        <defs>
                                            <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: 'rgba(255,255,255,0.3)'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: 'rgba(255,255,255,0.3)'}} domain={[0, 100]} unit="%" />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px'}}
                                        />
                                        <Area type="monotone" dataKey="planned" name="PLANEJADO" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPlanned)" />
                                        <Area type="monotone" dataKey="actual" name="REALIZADO" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="glass-card border-white/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-sky-500" />
                                    Matriz de Produtividade
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={displayCurveData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: 'rgba(255,255,255,0.3)'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: 'rgba(255,255,255,0.3)'}} />
                                        <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '10px'}} />
                                        <Bar dataKey="actual" name="AVANÇO (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                        <Line type="monotone" dataKey="planned" name="META" stroke="#f59e0b" strokeWidth={2} dot={{r: 4, fill: '#f59e0b'}} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="glass-card border-white/5 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-rose-500/10 border border-rose-500/20">
                                <ShieldAlert className="w-5 h-5 text-rose-500" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-widest">Alerta de Metereologia</h4>
                                <p className="text-[10px] text-muted-foreground leading-tight max-w-md">Instabilidade prevista para as próximas 48h na Região Sul. Possível impacto em atividades de lançamento de cabos.</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="border-rose-500/30 text-rose-500 bg-rose-500/5 font-black uppercase text-[9px] tracking-widest">Ação Necessária</Badge>
                    </Card>
                </div>

                {/* Right Column: IA Insights */}
                <div className="space-y-6">
                    <Card className="glass-card border-white/5 bg-primary/5 h-full opacity-60">
                        <CardHeader className="pb-2 border-b border-white/5">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                IA Insights (Beta)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-6">
                            <div className="flex items-center justify-center h-40 border-2 border-dashed border-white/5 rounded-2xl">
                                <div className="text-center space-y-2">
                                    <Sparkles className="w-8 h-8 text-primary/20 mx-auto" />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        IA em fase de treinamento <br/>
                                        <span className="text-[8px] opacity-50">Dados insuficientes para predição</span>
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
                                <div className="text-[9px] font-black uppercase tracking-widest text-primary">Sugestão GAPO</div>
                                <p className="text-[9px] font-medium leading-relaxed italic">Novas sugestões serão geradas conforme o volume de RDOs aumentar no sistema.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}

