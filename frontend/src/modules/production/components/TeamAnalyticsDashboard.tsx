import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployees, Employee } from '@/hooks/useEmployees';
import { useTeams, Team } from '@/hooks/useTeams';
import { getLaborClassification } from '@/utils/laborUtils';
import { Users, HardHat, TrendingUp, PieChart as PieChartIcon, BarChart3, Loader2 } from 'lucide-react';

interface TeamAnalyticsDashboardProps {
    projectId: string;
    selectedSiteId?: string;
}

export default function TeamAnalyticsDashboard({ projectId: selectedProjectId, selectedSiteId = 'all' }: TeamAnalyticsDashboardProps) {
    const { employees, isLoading: loadingEmployees } = useEmployees();
    const { teams, isLoading: loadingTeams } = useTeams();

    const isLoading = loadingEmployees || loadingTeams;

    // Data aggregation for MOD vs MOI
    const modMoiData = useMemo(() => {
        if (!employees.length || !teams.length) return [];

        const assignedIds = new Set([
            ...teams.flatMap(t => t.members),
            ...teams.map(t => t.supervisorId).filter(Boolean) as string[]
        ]);

        const assignedEmployees = employees.filter(e => assignedIds.has(e.id));

        const counts = assignedEmployees.reduce((acc, emp) => {
            const laborType = getLaborClassification(emp.functionName);
            acc[laborType] = (acc[laborType] || 0) + 1;
            return acc;
        }, { MOD: 0, MOI: 0 } as Record<string, number>);

        return [
            { name: 'MOD (Direta)', value: counts.MOD, color: '#10b981' },
            { name: 'MOI (Indireta)', value: counts.MOI, color: '#3b82f6' }
        ];
    }, [employees, teams]);

    // Data aggregation for Team Sizes
    const teamSizesData = useMemo(() => {
        return teams
            .filter(t => (selectedSiteId === 'all' || t.siteId === selectedSiteId))
            .map(t => ({
                name: t.name,
                total: t.members.length + (t.supervisorId ? 1 : 0)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }, [teams, selectedSiteId]);

    // Labor Diversity (Functions)
    const functionDiversityData = useMemo(() => {
        const assignedIds = new Set([
            ...teams.flatMap(t => t.members),
            ...teams.map(t => t.supervisorId).filter(Boolean) as string[]
        ]);
        const assignedEmployees = employees.filter(e => assignedIds.has(e.id));

        const counts = assignedEmployees.reduce((acc, emp) => {
            const func = emp.functionName || 'Outros';
            acc[func] = (acc[func] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [employees, teams]);

    const stats = useMemo(() => {
        const ids = new Set([
            ...teams.flatMap(t => t.members),
            ...teams.map(t => t.supervisorId).filter(Boolean) as string[]
        ]);
        const totalAllocated = ids.size;
        const totalAvailable = employees.length;
        const allocationRate = totalAvailable > 0 ? (totalAllocated / totalAvailable) * 100 : 0;

        return {
            totalAllocated,
            allocationRate,
            activeFronts: teams.length
        };
    }, [employees, teams]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-white animate-pulse font-bold uppercase text-[10px] tracking-widest">Calculando Alocação...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">EFETIVO ALOCADO</p>
                            <h3 className="text-2xl font-black mt-1 text-white">{stats.totalAllocated}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Users className="text-primary w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">TAXA DE ALOCAÇÃO</p>
                            <h3 className="text-2xl font-black mt-1 text-white">{stats.allocationRate.toFixed(1)}%</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <HardHat className="text-emerald-500 w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">FRENTES ATIVAS</p>
                            <h3 className="text-2xl font-black mt-1 text-white">{stats.activeFronts}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <TrendingUp className="text-blue-500 w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-primary" />
                            Distribuição MOD/MOI
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={modMoiData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {modMoiData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] font-bold uppercase text-slate-400">{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950/40 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            Efetivo por Equipe
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamSizesData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#6b7280"
                                    fontSize={9}
                                    width={100}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Efetivo" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
