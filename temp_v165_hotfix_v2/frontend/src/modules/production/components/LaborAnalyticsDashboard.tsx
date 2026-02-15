import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, AreaChart, Area,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Clock, TrendingUp, Users, HardHat, Filter,
    BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
    ArrowUpRight, Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { useEmployees } from '@/hooks/useEmployees';
import { useSites } from '@/hooks/useSites';
import { useCompanies } from '@/hooks/useCompanies';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LaborAnalyticsDashboardProps {
    projectId: string;
    projects: any[];
    timeRange: string;
}

export default function LaborAnalyticsDashboard({ projectId: selectedProjectId, projects, timeRange }: LaborAnalyticsDashboardProps) {
    // Database Hooks
    const { records, isLoading: loadingRecords } = useTimeRecords();
    const { employees, isLoading: loadingEmployees } = useEmployees();
    const { sites, isLoading: loadingSites } = useSites();
    const { companies, isLoading: loadingCompanies } = useCompanies();

    const isLoading = loadingRecords || loadingEmployees || loadingSites || loadingCompanies;

    const processedData = useMemo(() => {
        if (!records.length || !employees.length) return {
            hhhStats: [],
            distribution: [],
            totalHHH: 0,
            activeWorkers: 0,
            efficiency: 0
        };

        // Pre-map for performance
        const employeeMap = new Map(employees.map(e => [e.id, e]));
        const siteMap = new Map(sites.map(s => [s.id, s]));

        const now = new Date();
        let startDate = subDays(now, 30);
        if (timeRange === 'week') startDate = subDays(now, 7);
        if (timeRange === 'quarter') startDate = subDays(now, 90);
        if (timeRange === 'year') startDate = subDays(now, 365);

        // Filter Records
        const filteredRecords = records.filter(r => {
            const date = new Date(r.recordedAt);
            if (date < startDate) return false;

            const employee = employeeMap.get(r.employeeId);
            if (!employee) return false;

            const site = siteMap.get(employee.siteId);
            const matchesProject = selectedProjectId === 'all' || (site && site.projectId === selectedProjectId);

            return matchesProject;
        });

        // Calculate HHH
        const employeeDayRecords: { [key: string]: any[] } = {};
        filteredRecords.forEach(r => {
            const dayKey = format(new Date(r.recordedAt), 'yyyy-MM-dd');
            const key = `${r.employeeId}_${dayKey}`;
            if (!employeeDayRecords[key]) employeeDayRecords[key] = [];
            employeeDayRecords[key].push(r);
        });

        const dailyHHH: { [key: string]: number } = {};
        let totalHHHSum = 0;

        Object.values(employeeDayRecords).forEach(recs => {
            const sorted = recs.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
            let hours = 0;
            for (let i = 0; i < sorted.length - 1; i += 2) {
                if (sorted[i].recordType === 'entry' && sorted[i + 1].recordType === 'exit') {
                    const diff = new Date(sorted[i + 1].recordedAt).getTime() - new Date(sorted[i].recordedAt).getTime();
                    hours += diff / (1000 * 60 * 60);
                }
            }
            totalHHHSum += hours;
            const dateStr = format(new Date(sorted[0].recordedAt), 'dd/MM');
            dailyHHH[dateStr] = (dailyHHH[dateStr] || 0) + hours;
        });

        // Format Stats
        const days = eachDayOfInterval({ start: startDate, end: now });
        const activeProject = selectedProjectId !== 'all' ? projects.find(p => p.id === selectedProjectId) : null;
        const totalProjectPlanned = activeProject?.plannedHours || 0;

        const hhhStats = days.map(d => {
            const key = format(d, 'dd/MM');
            const realizado = dailyHHH[key] || 0;
            let planejado = 0;

            if (activeProject && activeProject.startDate && activeProject.endDate && totalProjectPlanned > 0) {
                const durationDays = Math.max(1, (new Date(activeProject.endDate).getTime() - new Date(activeProject.startDate).getTime()) / (1000 * 60 * 60 * 24));
                planejado = totalProjectPlanned / durationDays;
            } else {
                const workersThatDay = new Set(filteredRecords.filter(r => format(new Date(r.recordedAt), 'dd/MM') === key).map(r => r.employeeId)).size;
                planejado = workersThatDay * 8.8;
            }

            return {
                name: key,
                realizado: parseFloat(realizado.toFixed(1)),
                planejado: parseFloat(planejado.toFixed(1)),
                acumulado: 0
            };
        });

        let acc = 0;
        hhhStats.forEach(s => {
            acc += s.realizado;
            s.acumulado = parseFloat(acc.toFixed(1));
        });

        // Distribution
        const funcCount: { [key: string]: number } = {};
        const filteredEmployees = employees.filter(e => {
            const site = siteMap.get(e.siteId);
            return selectedProjectId === 'all' || (site && site.projectId === selectedProjectId);
        });

        filteredEmployees.forEach(e => {
            const func = e.functionName || 'Outros';
            funcCount[func] = (funcCount[func] || 0) + 1;
        });

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const distribution = Object.entries(funcCount).map(([name, count], i) => ({
            name,
            value: count,
            percentage: Math.round((count / Math.max(1, filteredEmployees.length)) * 100),
            color: colors[i % colors.length]
        })).slice(0, 6);

        return {
            hhhStats,
            distribution,
            totalHHH: Math.round(totalHHHSum),
            activeWorkers: filteredEmployees.length,
            efficiency: totalHHHSum > 0 ? Math.min(98, Math.round(((totalHHHSum) / (Math.max(1, filteredEmployees.length) * 8.8 * hhhStats.length)) * 100 * 2)) : 0
        };
    }, [records, employees, sites, timeRange, selectedProjectId, projects]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-white animate-pulse font-bold uppercase text-[10px] tracking-widest">Sincronizando Mão de Obra...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Real Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md overflow-hidden group hover:border-primary/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">HHH REALIZADO</p>
                                <h3 className="text-2xl font-black mt-1 text-white">{processedData.totalHHH.toLocaleString()}h</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                <Clock className="text-primary w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-primary/60 mt-4 uppercase">Baseado em {records.length} registros</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md overflow-hidden group hover:border-amber-500/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">APROVEITAMENTO</p>
                                <h3 className="text-2xl font-black mt-1 text-white">{processedData.efficiency}%</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                <TrendingUp className="text-amber-500 w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-4 text-[9px] font-bold text-emerald-500 uppercase">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Controle de jornada ativo</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">MÃO DE OBRA</p>
                                <h3 className="text-2xl font-black mt-1 text-white">{processedData.activeWorkers}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <Users className="text-emerald-500 w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground mt-4 uppercase">Funcionários no escopo</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md overflow-hidden group hover:border-purple-500/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">CANTEIROS</p>
                                <h3 className="text-2xl font-black mt-1 text-white">{sites.length}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                                <HardHat className="text-purple-500 w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground mt-4 uppercase">Áreas monitoradas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-primary" />
                    <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">Análise de Jornada</h2>
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 bg-white/5 rounded-md">
                    Periodo: {timeRange === 'week' ? 'Semana' : timeRange === 'month' ? 'Mês' : timeRange === 'quarter' ? 'Trimestre' : 'Ano'}
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            HHH Diário Realizado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        {processedData.hhhStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={processedData.hhhStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                                    />
                                    <Bar dataKey="realizado" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Realizado" />
                                    <Bar dataKey="planejado" fill="#3b82f6" fillOpacity={0.2} radius={[4, 4, 0, 0]} name="Planejado" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-30">Sem registros</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Curva de Esforço (HHH)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={processedData.hhhStats}>
                                <defs>
                                    <linearGradient id="colorHHH" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                                <YAxis stroke="#6b7280" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                <Area type="monotone" dataKey="acumulado" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHHH)" name="Acumulado" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-primary" />
                            Distribuição por Função
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        {processedData.distribution.length > 0 ? (
                            <div className="w-full h-full flex flex-col md:flex-row items-center">
                                <ResponsiveContainer width="70%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={processedData.distribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {processedData.distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-col gap-2 shrink-0 min-w-[140px] border-l border-white/5 pl-4">
                                    {processedData.distribution.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-[9px] font-bold text-slate-400 truncate w-20">{item.name}</span>
                                            <span className="text-[9px] font-black text-white ml-auto">{item.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest opacity-30">Sem dados de funcionários</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <LineChartIcon className="w-4 h-4 text-emerald-500" />
                            Tendência de Mobilização
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={processedData.hhhStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                <Line type="stepAfter" dataKey="realizado" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} name="Volume HHH" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
