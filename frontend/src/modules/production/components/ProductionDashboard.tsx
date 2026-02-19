import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TowerProductionData, ProductionCategory } from '../types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, isBefore, isAfter, min, max, addMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarDays, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { orionApi } from '@/integrations/orion/client';

interface ProductionDashboardProps {
    projectId: string;
    towers?: TowerProductionData[];
    categories?: ProductionCategory[];
}

type GranularityType = 'weekly' | 'monthly';

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ projectId, towers, categories }) => {
    const [selectedActivityId, setSelectedActivityId] = useState<string>("all");
    const [granularity, setGranularity] = useState<GranularityType>('monthly');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Fetch S-Curve Data from Backend
    const { data: curveData = [], isLoading } = useQuery({
        queryKey: ['production-s-curve', projectId, selectedActivityId, granularity, startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams({
                projectId,
                granularity,
                activityId: selectedActivityId
            });
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await orionApi.get(`/analytics/production/physical?${params.toString()}`);
            return res.data as any[];
        },
        enabled: !!projectId
    });

    // Calculate current metrics
    const currentMetric = useMemo(() => {
        if (curveData.length === 0) return { actual: 0, planned: 0 };
        const today = new Date();
        const currentData = curveData.find(d => {
            const date = new Date(d.date);
            return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        }) || curveData[curveData.length - 1];

        return {
            actual: currentData.actual,
            planned: currentData.planned
        };
    }, [curveData]);

    const activityOptions = useMemo(() => {
        if (!categories) return [];
        return categories.flatMap(c => c.activities.map(a => ({
            id: a.id,
            name: `${c.name} - ${a.name}`
        })));
    }, [categories]);

    // Auto-detect project dates from data
    const detectedDates = useMemo(() => {
        if (!towers) return { start: '', end: '' };
        const dates: Date[] = [];
        towers.forEach(t => {
            t.activitySchedules?.forEach(s => {
                if (s.plannedStart) dates.push(new Date(s.plannedStart));
                if (s.plannedEnd) dates.push(new Date(s.plannedEnd));
            });
        });
        if (dates.length === 0) return { start: '', end: '' };
        return {
            start: format(min(dates), 'yyyy-MM-dd'),
            end: format(max(dates), 'yyyy-MM-dd')
        };
    }, [towers]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">

            {/* Control Panel */}
            <div className="flex flex-col gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                {/* Row 1: Activity Filter + Metrics */}
                <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                    <div className="w-full sm:w-[300px] space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Filtrar por Atividade</Label>
                        <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                            <SelectTrigger className="bg-black/40 border-white/10 text-xs h-9">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="all">VISÃO GERAL (TODAS)</SelectItem>
                                {activityOptions.map(opt => (
                                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-4 ml-auto">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-right">Real</span>
                            <span className="text-xl font-bold text-sky-500 font-mono text-right">{currentMetric.actual.toFixed(1)}%</span>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-right">Planejado</span>
                            <span className="text-xl font-bold text-amber-500 font-mono text-right">{currentMetric.planned.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                {/* Row 2: Date Range + Granularity */}
                <div className="flex flex-col sm:flex-row gap-4 items-end border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-amber-500" />
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest whitespace-nowrap">Período do Projeto</Label>
                    </div>

                    <div className="flex gap-2 items-center">
                        <div className="space-y-1">
                            <Label className="text-[9px] text-slate-500 uppercase">Início</Label>
                            <Input
                                type="date"
                                className="h-8 text-xs bg-black/40 border-slate-700 w-36"
                                value={startDate || detectedDates.start}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <span className="text-slate-500 mt-4">→</span>
                        <div className="space-y-1">
                            <Label className="text-[9px] text-slate-500 uppercase">Fim</Label>
                            <Input
                                type="date"
                                className="h-8 text-xs bg-black/40 border-slate-700 w-36"
                                value={endDate || detectedDates.end}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Granularidade</Label>
                        <div className="flex bg-black/40 rounded-lg p-0.5 border border-slate-700">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-3 text-xs rounded-md ${granularity === 'weekly' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400'}`}
                                onClick={() => setGranularity('weekly')}
                            >
                                <ZoomIn className="h-3 w-3 mr-1" />
                                Semanal
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-3 text-xs rounded-md ${granularity === 'monthly' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400'}`}
                                onClick={() => setGranularity('monthly')}
                            >
                                <ZoomOut className="h-3 w-3 mr-1" />
                                Mensal
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card className="bg-slate-950/50 border-amber-900/20 backdrop-blur-sm">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Curva S - {selectedActivityId === 'all' ? 'Físico Geral' : activityOptions.find(a => a.id === selectedActivityId)?.name}
                            <span className="text-[10px] text-slate-600 font-normal">({granularity === 'weekly' ? 'Semanal' : 'Mensal'})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px] pt-4">
                        {curveData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={curveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis
                                        dataKey="period"
                                        stroke="#666"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                        interval={granularity === 'weekly' ? 1 : 0}
                                        angle={granularity === 'weekly' ? -45 : 0}
                                        textAnchor={granularity === 'weekly' ? 'end' : 'middle'}
                                        height={granularity === 'weekly' ? 60 : 30}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        unit="%"
                                        domain={[0, 100]}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: '12px' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                        formatter={(value: any, name: any) => [
                                            typeof value === 'number' ? `${value.toFixed(2)}%` : value,
                                            name === 'planned' ? 'Planejado' : 'Realizado'
                                        ]}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Area
                                        type="monotone"
                                        dataKey="planned"
                                        name="planned"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        fill="url(#gradPlanned)"
                                        activeDot={{ r: 4, fill: '#f59e0b' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="actual"
                                        name="actual"
                                        stroke="#0ea5e9"
                                        strokeWidth={2}
                                        fill="url(#gradActual)"
                                        activeDot={{ r: 4, fill: '#0ea5e9' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <p className="text-sm">Sem dados suficientes para gerar a curva.</p>
                                <p className="text-xs opacity-50">Certifique-se de preencher as datas de planejamento e atualizar os status.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProductionDashboard;
