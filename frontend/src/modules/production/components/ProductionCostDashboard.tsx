import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';
import { TowerProductionData, ProductionCategory } from '../types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, isBefore, min, max, addMonths, startOfWeek, endOfWeek, addWeeks, eachQuarterOfInterval, eachYearOfInterval, endOfQuarter, endOfYear, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CalendarDays } from 'lucide-react';

interface ProductionCostDashboardProps {
    projectId: string;
    towers?: TowerProductionData[];
    categories?: ProductionCategory[];
    unitCosts?: any[];
}

type GranularityType = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'total';

export default function ProductionCostDashboard({ towers, categories, unitCosts }: ProductionCostDashboardProps) {
    const [granularity, setGranularity] = useState<GranularityType>('monthly');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const getCost = (activityId: string) => {
        const cost = unitCosts?.find(c => c.activityId === activityId);
        return cost ? Number(cost.unitPrice) : 0;
    };

    // Auto-detect project dates
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

    const financialData = useMemo(() => {
        if (!towers || !unitCosts || !categories) return { curve: [], stats: { budget: 0, earned: 0 }, pareto: [] };

        let totalBudget = 0;
        let totalEarned = 0;

        const items: {
            name: string;
            plannedEnd: Date;
            actualEnd?: Date;
            cost: number;
            isFinished: boolean;
        }[] = [];

        towers.forEach(t => {
            categories.forEach(cat => {
                cat.activities.forEach(act => {
                    const price = getCost(act.id);
                    if (price <= 0) return;

                    const schedule = t.activitySchedules?.find(s => s.activityId === act.id);
                    const status = t.activityStatuses?.find(s => s.activityId === act.id);

                    if (schedule && schedule.plannedEnd) {
                        const qty = schedule.plannedQuantity ? Number(schedule.plannedQuantity) : 1;
                        const itemValue = qty * price;

                        // totalBudget += itemValue; // REMOVIDO: Agora calculado dinamicamente com base no filtro
                        // if (status?.status === 'FINISHED') {
                        //     totalEarned += itemValue; // REMOVIDO
                        // }

                        items.push({
                            name: act.name,
                            plannedEnd: startOfDay(new Date(schedule.plannedEnd)),
                            actualEnd: status?.endDate ? startOfDay(new Date(status.endDate)) : undefined,
                            cost: itemValue,
                            isFinished: status?.status === 'FINISHED'
                        });
                    }
                });
            });
        });

        if (items.length === 0) return { curve: [], stats: { budget: 0, earned: 0 }, pareto: [] };

        const allDates = items.flatMap(i => [i.plannedEnd, i.actualEnd].filter(Boolean) as Date[]);
        const minDetected = allDates.length > 0 ? min(allDates) : new Date();
        const maxDetected = allDates.length > 0 ? max(allDates) : new Date();

        const filterStart = startDate ? startOfDay(new Date(startDate)) : startOfMonth(minDetected);
        const filterEnd = endDate ? endOfDay(new Date(endDate)) : endOfMonth(maxDetected);

        const periodActivityCosts: Record<string, number> = {};

        // Reset stats for the filtered period
        totalBudget = 0;
        totalEarned = 0;

        items.forEach(item => {
            // Stats: Filter by period
            const budgetDate = item.plannedEnd;
            if (isWithinInterval(budgetDate, { start: filterStart, end: filterEnd })) {
                totalBudget += item.cost;
            }

            if (item.isFinished && item.actualEnd) {
                if (isWithinInterval(item.actualEnd, { start: filterStart, end: filterEnd })) {
                    totalEarned += item.cost;
                }
            }

            // Pareto: Filter by relevant date (Actual for realized, Planned for future/budget?)
            // Usually Pareto of Costs implies "Where money is going".
            // Let's stick to the previous key date logic or align with Budget?
            // The Original code used `refDate = actualEnd || plannedEnd` for Pareto.
            // Let's keep consistency for Pareto.
            const refDate = item.actualEnd || item.plannedEnd;
            if (isWithinInterval(refDate, { start: filterStart, end: filterEnd })) {
                periodActivityCosts[item.name] = (periodActivityCosts[item.name] || 0) + item.cost;
            }
        });

        let timeline: Date[];
        if (granularity === 'weekly') {
            timeline = eachWeekOfInterval({ start: filterStart, end: addWeeks(filterEnd, 1) }, { weekStartsOn: 1 });
        } else if (granularity === 'monthly') {
            timeline = eachMonthOfInterval({ start: filterStart, end: addMonths(filterEnd, 1) });
        } else if (granularity === 'quarterly') {
            timeline = eachQuarterOfInterval({ start: filterStart, end: filterEnd });
        } else if (granularity === 'annual') {
            timeline = eachYearOfInterval({ start: filterStart, end: filterEnd });
        } else {
            timeline = [filterStart];
        }

        const curve = timeline.map((period) => {
            let periodEnd: Date;
            if (granularity === 'weekly') periodEnd = endOfWeek(period, { weekStartsOn: 1 });
            else if (granularity === 'monthly') periodEnd = endOfMonth(period);
            else if (granularity === 'quarterly') periodEnd = endOfQuarter(period);
            else if (granularity === 'annual') periodEnd = endOfYear(period);
            else periodEnd = filterEnd;

            const plannedAcc = items
                .filter(i => isBefore(i.plannedEnd, periodEnd))
                .reduce((acc, curr) => acc + curr.cost, 0);

            const actualAcc = items
                .filter(i => i.actualEnd && isBefore(i.actualEnd, periodEnd))
                .reduce((acc, curr) => acc + curr.cost, 0);

            let label: string;
            if (granularity === 'weekly') label = `S${format(period, 'ww')} - ${format(period, 'dd/MM')}`;
            else if (granularity === 'monthly') label = format(period, 'MMM/yy', { locale: ptBR });
            else if (granularity === 'quarterly') label = `${Math.floor(period.getMonth() / 3) + 1}º Trim/${format(period, 'yy')}`;
            else if (granularity === 'annual') label = format(period, 'yyyy');
            else label = 'GERAL';

            return {
                period: label,
                planned: plannedAcc,
                actual: actualAcc
            };
        });

        const pareto = Object.entries(periodActivityCosts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        return { curve, stats: { budget: totalBudget, earned: totalEarned }, pareto };

    }, [towers, unitCosts, categories, granularity, startDate, endDate]);

    const { curve, stats, pareto } = financialData;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const handleGranularityChange = (newGranularity: GranularityType) => {
        setGranularity(newGranularity);
        const now = new Date();
        if (newGranularity === 'weekly') {
            setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
            setEndDate(format(now, 'yyyy-MM-dd'));
        } else if (newGranularity === 'monthly') {
            setStartDate(format(subDays(now, 30), 'yyyy-MM-dd'));
            setEndDate(format(now, 'yyyy-MM-dd'));
        } else if (newGranularity === 'quarterly') {
            setStartDate(format(subDays(now, 90), 'yyyy-MM-dd'));
            setEndDate(format(now, 'yyyy-MM-dd'));
        } else if (newGranularity === 'annual') {
            setStartDate(format(subDays(now, 365), 'yyyy-MM-dd'));
            setEndDate(format(now, 'yyyy-MM-dd'));
        } else if (newGranularity === 'total') {
            setStartDate(detectedDates.start);
            setEndDate(detectedDates.end);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-950/50 border-amber-900/20 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] items-center text-slate-400 uppercase tracking-widest font-bold">Orçamento Total (CAPEX)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500 font-mono">
                            {formatCurrency(stats.budget)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-950/50 border-sky-900/20 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] items-center text-slate-400 uppercase tracking-widest font-bold">Valor Agregado (Realizado)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-500 font-mono">
                            {formatCurrency(stats.earned)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-950/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] items-center text-slate-400 uppercase tracking-widest font-bold">Desvio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold font-mono ${stats.earned < stats.budget ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {((stats.earned / (stats.budget || 1)) * 100).toFixed(1)}%
                        </div>
                        <p className="text-[10px] text-slate-500">do orçamento total</p>
                    </CardContent>
                </Card>
            </div>

            {/* Date Range + Granularity Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-end bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-amber-500" />
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest whitespace-nowrap">Período</Label>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="space-y-1">
                        <Label className="text-[9px] text-slate-500 uppercase">Início</Label>
                        <Input
                            type="date"
                            className="h-8 text-xs bg-black/40 border-slate-700 w-36 font-bold"
                            value={startDate || detectedDates.start}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <span className="text-slate-500 mt-4">→</span>
                    <div className="space-y-1">
                        <Label className="text-[9px] text-slate-500 uppercase">Fim</Label>
                        <Input
                            type="date"
                            className="h-8 text-xs bg-black/40 border-slate-700 w-36 font-bold"
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
                            className={`h-7 px-3 text-[10px] font-bold uppercase tracking-tight rounded-md ${granularity === 'weekly' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}
                            onClick={() => handleGranularityChange('weekly')}
                        >
                            Semanal
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-3 text-[10px] font-bold uppercase tracking-tight rounded-md ${granularity === 'monthly' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}
                            onClick={() => handleGranularityChange('monthly')}
                        >
                            Mensal
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-3 text-[10px] font-bold uppercase tracking-tight rounded-md ${granularity === 'quarterly' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}
                            onClick={() => handleGranularityChange('quarterly')}
                        >
                            Trimestral
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-3 text-[10px] font-bold uppercase tracking-tight rounded-md ${granularity === 'annual' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}
                            onClick={() => handleGranularityChange('annual')}
                        >
                            Anual
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-3 text-[10px] font-bold uppercase tracking-tight rounded-md ${granularity === 'total' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}
                            onClick={() => handleGranularityChange('total')}
                        >
                            Geral
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* S-Curve */}
                <Card className="lg:col-span-2 bg-slate-950/50 border-amber-900/20 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Curva S Financeira (Acumulada)
                            <span className="text-[10px] text-slate-600 font-normal">({granularity === 'weekly' ? 'Semanal' : 'Mensal'})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={curve} margin={{ top: 10, right: 10, left: 30, bottom: granularity === 'weekly' ? 50 : 10 }}>
                                <defs>
                                    <linearGradient id="gradFinPlanned" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradFinActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
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
                                />
                                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="planned" name="Orçado Acumulado" stroke="#f59e0b" fill="url(#gradFinPlanned)" strokeWidth={2} />
                                <Area type="monotone" dataKey="actual" name="Realizado Acumulado" stroke="#0ea5e9" fill="url(#gradFinActual)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Pareto */}
                <Card className="bg-slate-950/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Top Custos (Pareto)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pareto} layout="vertical" margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                                    {pareto.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 3 ? '#f59e0b' : '#334155'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
