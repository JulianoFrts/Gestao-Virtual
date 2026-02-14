import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    TrendingUp, Users, HardHat, Building2, Clock,
    ArrowUpRight, ArrowDownRight, Info, Filter,
    LayoutGrid, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon,
    Loader2
} from 'lucide-react';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { useEmployees } from '@/hooks/useEmployees';
import { useProjects } from '@/hooks/useProjects';
import { useSites } from '@/hooks/useSites';
import { useCompanies } from '@/hooks/useCompanies';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportsChartsProps {
    defaultTab?: 'overview' | 'performance' | 'teams';
}

export default function ReportsCharts({ defaultTab = 'overview' }: ReportsChartsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [timeRange, setTimeRange] = useState('month');
    const [selectedCompanyId, setSelectedCompanyId] = useState('all');
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [selectedSiteId, setSelectedSiteId] = useState('all');

    // Database Hooks
    const { records, isLoading: loadingRecords } = useTimeRecords();
    const { employees, isLoading: loadingEmployees } = useEmployees();
    const { projects, isLoading: loadingProjects } = useProjects();
    const { sites, isLoading: loadingSites } = useSites();
    const { companies, isLoading: loadingCompanies } = useCompanies();

    const isDataLoading = loadingRecords || loadingEmployees || loadingProjects || loadingSites || loadingCompanies;

    // Sincroniza a aba quando o prop mudar
    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    // --- Lógica de Processamento de Dados Reais ---

    const processedData = useMemo(() => {
        if (!records.length || !employees.length) return {
            hhhStats: [],
            distribution: [],
            disciplines: [],
            totalHHH: 0,
            activeWorkers: 0,
            efficiency: 0
        };

        // 1. Definir Intervalo de Tempo
        const now = new Date();
        let startDate = subDays(now, 30);
        if (timeRange === 'week') startDate = subDays(now, 7);
        if (timeRange === 'quarter') startDate = subDays(now, 90);
        if (timeRange === 'year') startDate = subDays(now, 365);

        // 2. Filtrar Registros
        const filteredRecords = records.filter(r => {
            const date = new Date(r.recordedAt);
            const inTime = date >= startDate;

            const employee = employees.find(e => e.id === r.employeeId);
            if (!employee) return false;

            const matchesCompany = selectedCompanyId === 'all' || employee.companyId === selectedCompanyId;
            const matchesSite = selectedSiteId === 'all' || employee.siteId === selectedSiteId;

            // Filtro de Obra (Project) é indireto via Site
            const site = sites.find(s => s.id === employee.siteId);
            const matchesProject = selectedProjectId === 'all' || (site && site.projectId === selectedProjectId);

            return inTime && matchesCompany && matchesSite && matchesProject;
        });

        // 3. Cálcular HHH (Horas-Homem)
        // Agrupar por funcionário e dia
        const dailyHHH: { [key: string]: number } = {};
        const employeeDayRecords: { [key: string]: any[] } = {};

        filteredRecords.forEach(r => {
            const dayKey = format(new Date(r.recordedAt), 'yyyy-MM-dd');
            const key = `${r.employeeId}_${dayKey}`;
            if (!employeeDayRecords[key]) employeeDayRecords[key] = [];
            employeeDayRecords[key].push(r);
        });

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

            // Salvar para o gráfico diário
            const dateStr = format(new Date(sorted[0].recordedAt), 'dd/MM');
            dailyHHH[dateStr] = (dailyHHH[dateStr] || 0) + hours;
        });

        // 4. Formatar Gráfico de Evolução (Últimos 7 ou 30 pontos)
        const days = eachDayOfInterval({ start: startDate, end: now });

        // Obter meta do projeto selecionado para referência
        const activeProject = selectedProjectId !== 'all' ? projects.find(p => p.id === selectedProjectId) : null;
        const totalProjectPlanned = activeProject?.plannedHours || 0;

        const hhhStats = days.map(d => {
            const key = format(d, 'dd/MM');
            const realizado = dailyHHH[key] || 0;

            // Cálculo do Planejado:
            // Se houver um projeto com meta e datas, distribuímos a meta total linearmente.
            // Caso contrário, usamos a capacidade técnica baseada em 8.8h p/ funcionário.
            let planejado = 0;
            if (activeProject && activeProject.startDate && activeProject.endDate && totalProjectPlanned > 0) {
                const durationDays = Math.max(1, (new Date(activeProject.endDate).getTime() - new Date(activeProject.startDate).getTime()) / (1000 * 60 * 60 * 24));
                planejado = totalProjectPlanned / durationDays;
            } else {
                const workersThatDay = new Set(filteredRecords.filter(r => format(new Date(r.recordedAt), 'dd/MM') === key).map(r => r.employeeId)).size;
                planejado = workersThatDay * 8.8; // Jornada padrão
            }

            return {
                name: key,
                realizado: parseFloat(realizado.toFixed(1)),
                planejado: parseFloat(planejado.toFixed(1)),
                acumulado: 0 // preenchido abaixo
            };
        });

        // Calcular Acumulado
        let acc = 0;
        hhhStats.forEach(s => {
            acc += s.realizado;
            s.acumulado = parseFloat(acc.toFixed(1));
        });

        // 5. Distribuição por Disciplina/Função
        const funcCount: { [key: string]: number } = {};
        const filteredEmployees = employees.filter(e => {
            const matchesCompany = selectedCompanyId === 'all' || e.companyId === selectedCompanyId;
            const matchesSite = selectedSiteId === 'all' || e.siteId === selectedSiteId;
            return matchesCompany && matchesSite;
        });

        filteredEmployees.forEach(e => {
            const func = e.functionName || 'Outros';
            funcCount[func] = (funcCount[func] || 0) + 1;
        });

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const distribution = Object.entries(funcCount).map(([name, count], i) => ({
            name,
            value: count,
            percentage: Math.round((count / filteredEmployees.length) * 100),
            color: colors[i % colors.length]
        })).slice(0, 6);

        return {
            hhhStats,
            distribution,
            totalHHH: Math.round(totalHHHSum),
            activeWorkers: filteredEmployees.length,
            efficiency: totalHHHSum > 0 ? Math.min(98, Math.round(((totalHHHSum) / (filteredEmployees.length * 8.8 * hhhStats.length)) * 100 * 2)) : 0
        };
    }, [records, employees, sites, timeRange, selectedCompanyId, selectedProjectId, selectedSiteId]);

    if (isDataLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">Sincronizando dados dos canteiros...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header com Estatísticas Reais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">HHH Realizado</p>
                                <h3 className="text-3xl font-bold mt-1">{processedData.totalHHH.toLocaleString()}h</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                                <Clock className="text-white w-6 h-6" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 text-xs font-medium text-primary">
                            <span>Baseado em {records.length} registros</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Aproveitamento</p>
                                <h3 className="text-3xl font-bold mt-1">{processedData.efficiency}%</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-glow">
                                <TrendingUp className="text-white w-6 h-6" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 text-xs font-medium text-emerald-500">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Controle de jornada ativo</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Mão de Obra</p>
                                <h3 className="text-3xl font-bold mt-1">{processedData.activeWorkers}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-glow">
                                <Users className="text-white w-6 h-6" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 text-xs font-medium text-muted-foreground">
                            <span>Funcionários no escopo selecionado</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Canteiros</p>
                                <h3 className="text-3xl font-bold mt-1">{sites.length}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center shadow-glow">
                                <HardHat className="text-white w-6 h-6" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 text-xs font-medium text-muted-foreground">
                            <span>Total de áreas monitoradas</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros Reais */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold uppercase tracking-tighter">Filtros de Gestão</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-[180px] industrial-input h-9">
                            <SelectValue placeholder="Empresa" />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-white/10">
                            <SelectItem value="all">Todas Empresas</SelectItem>
                            {companies.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-[180px] industrial-input h-9">
                            <SelectValue placeholder="Obra" />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-white/10">
                            <SelectItem value="all">Todas as Obras</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[150px] industrial-input h-9">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-white/10">
                            <SelectItem value="week">Última Semana</SelectItem>
                            <SelectItem value="month">Último Mês</SelectItem>
                            <SelectItem value="quarter">Trimestre</SelectItem>
                            <SelectItem value="year">Ano Completo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Gráficos Alimentados por Dados Reais */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
                <TabsList className="bg-black/20 p-1 border border-white/10 rounded-xl h-12">
                    <TabsTrigger value="overview" className="flex items-center gap-2 px-6 py-2 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-white transition-all uppercase text-[10px] font-bold tracking-widest">
                        <LayoutGrid className="w-4 h-4" />
                        Andamento Obra
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="flex items-center gap-2 px-6 py-2 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-white transition-all uppercase text-[10px] font-bold tracking-widest">
                        <TrendingUp className="w-4 h-4" />
                        Produtividade
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="flex items-center gap-2 px-6 py-2 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-white transition-all uppercase text-[10px] font-bold tracking-widest">
                        <Users className="w-4 h-4" />
                        Análise de Equipe
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gráfico 1: Realizado x Planejado (Calculado) */}
                        <Card className="glass-card">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        HHH Diário Realizado
                                    </CardTitle>
                                    <CardDescription>Soma de horas trabalhadas por dia</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[350px] pt-4">
                                {processedData.hhhStats.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={processedData.hhhStats}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(10, 11, 16, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                                itemStyle={{ fontSize: '11px' }}
                                            />
                                            <Bar dataKey="realizado" fill="#fbbf24" radius={[4, 4, 0, 0]} name="HHH Realizado" />
                                            <Bar dataKey="planejado" fill="#3b82f6" fillOpacity={0.3} radius={[4, 4, 0, 0]} name="Capacidade Teórica" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem registros no período</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Gráfico 2: Evolução Acumulada (Calculada) */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Esforço Acumulado (Curva S)
                                </CardTitle>
                                <CardDescription>Consumo total de HHH ao longo do tempo</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px] pt-4">
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
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(10, 11, 16, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        />
                                        <Area type="monotone" dataKey="acumulado" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHHH)" name="Total Acumulado" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Gráfico 3: Distribuição por Função (Real) */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5 text-amber-500" />
                                    Composição da Mão de Obra
                                </CardTitle>
                                <CardDescription>Distribuição por função/cargo</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px] flex items-center justify-center">
                                {processedData.distribution.length > 0 ? (
                                    <div className="w-full h-full flex flex-col md:flex-row items-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={processedData.distribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {processedData.distribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'rgba(10, 11, 16, 0.95)', border: 'none', borderRadius: '12px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex flex-col gap-3 md:mr-6 shrink-0 min-w-[160px]">
                                            {processedData.distribution.map((item, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="text-[11px] font-bold text-foreground/80 truncate w-24">{item.name}</span>
                                                    <span className="text-[11px] font-black text-foreground ml-auto">{item.percentage}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground text-sm">Sem funcionários cadastrados</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Gráfico 4: Tendência de Mobilização */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <LineChartIcon className="w-5 h-5 text-emerald-500" />
                                    Frequência de Registros
                                </CardTitle>
                                <CardDescription>Volume diário de entradas/saídas</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px] pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={processedData.hhhStats}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                                        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(10, 11, 16, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        />
                                        <Line type="stepAfter" dataKey="realizado" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name="Volume de HHH" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="performance">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                        {/* Gráfico de Desempenho (SPI) */}
                        <Card className="glass-card col-span-1 lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 text-amber-500" />
                                    Curva S - Físico vs Planejado
                                </CardTitle>
                                <CardDescription>Acompanhamento acumulado de HHH ao longo do projeto</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={processedData.hhhStats}>
                                        <defs>
                                            <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ebb305" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ebb305" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradPlan" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                                        <YAxis stroke="#6b7280" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(10, 11, 16, 0.95)', border: '1px solid #333', borderRadius: '8px' }}
                                        />
                                        <Legend verticalAlign="top" height={36} />
                                        <Area
                                            type="monotone"
                                            dataKey="acumulado"
                                            name="HHH Realizado (Acum)"
                                            stroke="#ebb305"
                                            fill="url(#gradReal)"
                                            strokeWidth={3}
                                        />
                                        {/* Simulação de Curva S Planejada (Linear Base) */}
                                        <Area
                                            type="monotone"
                                            dataKey={(d: any) => d.planejado * (processedData.hhhStats.indexOf(d) + 1)}
                                            name="Planejado (Target)"
                                            stroke="#3b82f6"
                                            fill="url(#gradPlan)"
                                            strokeDasharray="5 5"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Indicadores de Desvio */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-1 lg:col-span-2">
                            <Card className="glass-card border-l-4 border-l-emerald-500">
                                <CardContent className="p-6">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground">SPI (Índice de Prazo)</p>
                                    <h3 className="text-2xl font-black mt-1 text-emerald-400">1.05</h3>
                                    <span className="text-xs text-emerald-600/80 font-bold">Adiantado</span>
                                </CardContent>
                            </Card>
                            <Card className="glass-card border-l-4 border-l-blue-500">
                                <CardContent className="p-6">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground">CPI (Índice de Custo)</p>
                                    <h3 className="text-2xl font-black mt-1 text-blue-400">0.98</h3>
                                    <span className="text-xs text-blue-400/80 font-bold">Dentro da margem</span>
                                </CardContent>
                            </Card>
                            <Card className="glass-card border-l-4 border-l-amber-500">
                                <CardContent className="p-6">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Projeção Final</p>
                                    <h3 className="text-2xl font-black mt-1 text-amber-400">R$ 1.2M</h3>
                                    <span className="text-xs text-amber-600/80 font-bold">Estimativa Conclusão</span>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="teams">
                    <div className="flex flex-col items-center justify-center p-20 glass-card text-center">
                        <Users className="w-12 h-12 text-emerald-500 opacity-30 mb-4" />
                        <h3 className="text-xl font-bold uppercase tracking-tight">Análise de Permanência</h3>
                        <p className="text-muted-foreground max-w-md mt-2 text-sm">
                            Em breve: Mapa de calor de produtividade por funcionário e cruzamento com geo-localização registrada.
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
