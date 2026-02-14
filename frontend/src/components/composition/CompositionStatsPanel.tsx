import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Employee } from '@/hooks/useEmployees';
import { Team } from '@/hooks/useTeams';
import { getLaborClassification } from '@/utils/laborUtils';
import { Users, HardHat, TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

interface CompositionStatsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    employees: Employee[];
    teams: Team[];
    selectedSiteId: string;
    selectedProjectId: string;
    sites: any[];
    projects: any[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CompositionStatsPanel({
    isOpen,
    onClose,
    employees,
    teams,
    selectedSiteId,
    selectedProjectId,
    sites,
    projects
}: CompositionStatsPanelProps) {

    // Data aggregation for MOD vs MOI
    const modMoiData = React.useMemo(() => {
        // IDs assigned to teams
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
            { name: 'MOD (Direta)', value: counts.MOD, color: '#10b981' }, // Emerald
            { name: 'MOI (Indireta)', value: counts.MOI, color: '#3b82f6' } // Blue
        ];
    }, [employees, teams]);

    // Data aggregation for Team Sizes
    const teamSizesData = React.useMemo(() => {
        return teams
            .filter(t => (selectedSiteId === 'all' || t.siteId === selectedSiteId))
            .map(t => ({
                name: t.name,
                membros: t.members.length,
                total: t.members.length + (t.supervisorId ? 1 : 0)
            }))
            .sort((a, b) => b.total - a.total);
    }, [teams, selectedSiteId]);

    // Labor Diversity (Functions)
    const functionDiversityData = React.useMemo(() => {
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

    const totalAllocated = React.useMemo(() => {
        const ids = new Set([
            ...teams.flatMap(t => t.members),
            ...teams.map(t => t.supervisorId).filter(Boolean) as string[]
        ]);
        return ids.size;
    }, [teams]);

    const totalAvailable = employees.length;
    const allocationRate = totalAvailable > 0 ? (totalAllocated / totalAvailable) * 100 : 0;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:max-w-2xl glass-card border-white/10 p-0 text-foreground">
                <SheetHeader className="p-6 border-b border-white/5 bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20">
                            <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-2xl font-display font-bold">Analytics da Equipe</SheetTitle>
                            <SheetDescription className="text-muted-foreground">
                                Indicadores de alocação e distribuição de mão de obra.
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-10rem)] p-6">
                    <div className="space-y-6">
                        {/* Key Metrics Row */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card className="bg-black/20 border-white/5">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <Users className="w-5 h-5 text-primary mb-1" />
                                    <span className="text-2xl font-black">{totalAllocated}</span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Alocados</span>
                                </CardContent>
                            </Card>
                            <Card className="bg-black/20 border-white/5">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <HardHat className="w-5 h-5 text-emerald-500 mb-1" />
                                    <span className="text-2xl font-black">{allocationRate.toFixed(1)}%</span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Taxa de Alocação</span>
                                </CardContent>
                            </Card>
                            <Card className="bg-black/20 border-white/5 col-span-2 md:col-span-1">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <TrendingUp className="w-5 h-5 text-blue-500 mb-1" />
                                    <span className="text-2xl font-black">{teams.length}</span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Frentes Ativas</span>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* MOD vs MOI */}
                            <Card className="bg-white/5 border-white/5">
                                <CardHeader className="py-4">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <PieChartIcon className="w-4 h-4 text-primary" />
                                        Distribuição MOD/MOI
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={modMoiData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {modMoiData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Job Diversity */}
                            <Card className="bg-white/5 border-white/5">
                                <CardHeader className="py-4">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-primary" />
                                        Principais Cargos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={functionDiversityData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={100}
                                                style={{ fontSize: '10px' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Bar dataKey="value" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Team Sizes Bar Chart */}
                        <Card className="bg-white/5 border-white/5">
                            <CardHeader>
                                <CardTitle className="text-sm">Tamanho das Equipes (Efetivo Total)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={teamSizesData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                                        <YAxis style={{ fontSize: '10px' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="total" fill="#8b5cf6" name="Total Alocados" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
