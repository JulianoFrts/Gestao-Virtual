import React, { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TowerProductionData, ProductionCategory, ActivityStatus } from '../types';
import { format, addWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Plus,
    CalendarDays,
    CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Trash2, CalendarX2, AlertTriangle } from 'lucide-react';
import { orionApi } from "@/integrations/orion/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Parse date string preserving local day (avoids UTC timezone shift)
 * Input: "2026-01-26T12:00:00" or ISO strings like "2026-01-26T15:00:00.000Z"
 * Output: Date object at noon LOCAL time for the same calendar day
 */
const parseLocalDate = (dateStr: string): Date => {
    // Extract just the date part (YYYY-MM-DD) from various formats
    const datePart = dateStr.substring(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date at NOON local time to avoid any timezone boundary issues
    return new Date(year, month - 1, day, 12, 0, 0, 0);
};

interface SixWeekLookAheadProps {
    towers?: TowerProductionData[];
    categories?: ProductionCategory[];
    startDate?: string; // Optional override
    onEditActivity?: (towerId: string, activityId: string, plannedStart?: string, plannedEnd?: string) => void;
    onWeekClick?: (startDate: Date) => void;
    projectId?: string;
    companyId?: string;
}

export default function SixWeekLookAhead({ towers, categories, startDate, onEditActivity, onWeekClick, projectId, companyId }: SixWeekLookAheadProps) {
    const [activeWeekId, setActiveWeekId] = useState(1);
    const [showAllActivities, setShowAllActivities] = useState(false);

    // Bulk Delete State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteType, setDeleteType] = useState<'day' | 'week' | 'all' | 'project_all' | null>(null);
    const [deleteTargetDate, setDeleteTargetDate] = useState<Date | null>(null);
    const [deleteTargetWeekId, setDeleteTargetWeekId] = useState<number | null>(null);
    const [deleteTargetActivityId, setDeleteTargetActivityId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    // 1. Generate the 6 weeks for the selector/mutations (available everywhere)
    const weeks = useMemo(() => {
        const baseDate = startDate ? new Date(startDate) : new Date();
        const startOfPeriod = startOfWeek(baseDate, { weekStartsOn: 1 });

        return Array.from({ length: 6 }).map((_, i) => {
            const weekStart = addWeeks(startOfPeriod, i);
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
            return {
                id: i + 1,
                label: `Semana ${i + 1}`,
                dateRange: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
                start: weekStart,
                end: weekEnd
            };
        });
    }, [startDate]);

    const clearScheduleMutation = useMutation({
        mutationFn: async (params: { type: 'day' | 'week' | 'all' | 'project_all', targetWeekId?: number, targetDate?: Date, activityId?: string }) => {
            const { type, targetWeekId, targetDate, activityId } = params || {};
            if (!type) throw new Error("Parâmetros inválidos para limpeza (type is missing)");
            // 1. Calculate Date Range
            let startDate: Date;
            let endDate: Date;

            if (type === 'day' && targetDate) {
                startDate = new Date(targetDate);
                startDate.setHours(0, 0, 0, 0); // Local Midnight start
                endDate = new Date(targetDate);
                endDate.setHours(23, 59, 59, 999); // Local Midnight end
            } else if (type === 'week' && targetWeekId) {
                const targetWeek = weeks.find(w => w.id === targetWeekId);
                if (!targetWeek) throw new Error("Semana não encontrada");
                startDate = targetWeek.start;
                endDate = targetWeek.end;
            } else if (type === 'all') {
                startDate = weeks[0].start;
                endDate = weeks[weeks.length - 1].end;
            } else if (type === 'project_all') {
                // No date range - delete EVERYTHING in project
                toast.info("Enviando solicitação de limpeza TOTAL do projeto...");
                const res = await orionApi.delete('/production/schedule', {
                    scope: 'project_all',
                    projectId: projectId || 'all',
                    companyId: companyId || ''
                });
                if (res.error) throw new Error(res.error.message);
                return (res.data as unknown as { count: number })?.count || 0;
            } else {
                throw new Error("Invalid delete parameters");
            }

            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            toast.info("Enviando solicitação de limpeza em massa...");

            const res = await orionApi.delete('/production/schedule', {
                scope: 'batch',
                projectId: projectId || 'all',
                companyId: companyId || '',
                startDate: startDateStr,
                endDate: endDateStr,
                activityId: activityId
            });

            if (res.error) {
                throw new Error(res.error.message);
            }

            return (res.data as any)?.count || 0;
        },
        onSuccess: (data) => {
            const count = typeof data === 'object' ? data.count : data;
            const skipped = typeof data === 'object' ? data.skipped : 0;

            if (skipped > 0) {
                toast.success(`${count} agendamentos removidos. ${skipped} foram preservados por já terem execução.`);
            } else {
                toast.success(`${count} agendamentos removidos com sucesso!`);
            }

            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
            queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
            queryClient.invalidateQueries({ queryKey: ["production-status"] });
            setDeleteConfirmOpen(false);
            setDeleteType(null);
            setDeleteTargetDate(null);
            setDeleteTargetActivityId(null);
        },
    });

    const deleteUnitaryMutation = useMutation({
        mutationFn: async (params: { scheduleId: string, targetDate: string }) => {
            const res = await orionApi.delete('/production/schedule', {
                scheduleId: params.scheduleId,
                targetDate: params.targetDate // Send target date to allow smart splitting
            });
            if (res.error) throw new Error(res.error.message);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Agendamento atualizado!");
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
            queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
        },
        onError: (err) => {
            toast.error(`Erro ao remover: ${(err as Error).message}`);
        }
    });

    const confirmDelete = (type: 'day' | 'week' | 'all' | 'project_all', date?: Date, weekId?: number, activityId?: string) => {
        setDeleteType(type);
        if (date) setDeleteTargetDate(date);

        // Reset activity ID unless provided
        setDeleteTargetActivityId(activityId || null);

        if (weekId) {
            setDeleteTargetWeekId(weekId);
        } else if (type === 'week') {
            // Default to current active week if not specified
            setDeleteTargetWeekId(activeWeekId);
        }
        setDeleteConfirmOpen(true);
    };

    const lookAheadData = useMemo(() => {
        if (!towers) return { activeWeekDays: [], rows: [], dailyTotals: [] };

        // Get the active week and its days (Mon-Sun)
        const currentWeek = weeks.find(w => w.id === activeWeekId) || weeks[0];
        const daysList = Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(currentWeek.start, i);
            return {
                date: day,
                label: format(day, 'EEEE', { locale: ptBR }),
                shortLabel: format(day, 'EEE', { locale: ptBR }).toUpperCase(),
                dayNum: format(day, 'dd/MM')
            };
        });

        // Group by Activity ID
        const activityGroups = new Map<string, any>();

        towers.forEach(tower => {
            tower.activitySchedules?.forEach(schedule => {
                if (!schedule.plannedStart) return;

                const actStart = parseLocalDate(schedule.plannedStart);
                const actEnd = schedule.plannedEnd ? parseLocalDate(schedule.plannedEnd) : actStart;

                // Check intersection with any day of the *active* week
                const activityId = schedule.activityId;

                if (!activityGroups.has(activityId)) {
                    const activity = categories
                        ?.flatMap(c => c.activities)
                        .find(a => a.id === activityId);

                    const categoryName = categories?.find(c => c.id === activity?.categoryId)?.name || 'Outros';

                    activityGroups.set(activityId, {
                        activityId,
                        activityName: activity?.name || 'Desconhecida',
                        categoryName,
                        days: daysList.map(d => ({
                            isScheduled: false,
                            towers: [] as any[]
                        }))
                    });
                }

                const group = activityGroups.get(activityId);
                const towerStatus = tower.activityStatuses?.find(s => s.activityId === activityId);

                daysList.forEach((d, dIdx) => {
                    // Use string comparison (YYYY-MM-DD) for absolute date matching regardless of timezone
                    const dayKey = format(d.date, 'yyyy-MM-dd');
                    const startKey = format(actStart, 'yyyy-MM-dd');
                    const endKey = format(actEnd, 'yyyy-MM-dd');

                    const overlapsDay = dayKey >= startKey && dayKey <= endKey;

                    if (overlapsDay) {
                        group.days[dIdx].isScheduled = true;
                        group.days[dIdx].towers.push({
                            id: tower.id,
                            scheduleId: schedule.id, // Keep the schedule ID for unitary delete
                            name: tower.objectId,
                            status: towerStatus?.status || 'PENDING',
                            progress: towerStatus?.progressPercent || 0,
                            plannedQuantity: schedule.plannedQuantity || 0
                        });
                    }
                });
            });
        });

        // Ensure all activities exist if showAllActivities is true
        if (showAllActivities && categories) {
            categories.forEach(cat => {
                cat.activities.forEach(act => {
                    if (!activityGroups.has(act.id)) {
                        activityGroups.set(act.id, {
                            activityId: act.id,
                            activityName: act.name,
                            categoryName: cat.name,
                            days: daysList.map(() => ({
                                isScheduled: false,
                                towers: [] as TowerProductionData[]
                            }))
                        });
                    }
                });
            });
        }

        // Final Filter: Only rows that have at least one scheduled day in the active week
        // OR if showAllActivities is true
        const rowsList = Array.from(activityGroups.values())
            .filter(row => showAllActivities || row.days.some((d: { isScheduled: boolean }) => d.isScheduled))
            .map(row => {
                const activity = categories?.flatMap(c => c.activities).find(a => a.id === row.activityId);
                const category = categories?.find(c => c.id === activity?.categoryId);

                return {
                    ...row,
                    categoryOrder: category?.order ?? 0,
                    activityOrder: activity?.order ?? 0,
                    daySchedules: row.days.map((d: { isScheduled: boolean; towers: TowerProductionData[] }) => {
                        if (!d.isScheduled) return { isScheduled: false };

                        const finishedCount = d.towers.filter((t: any) => t.status === 'FINISHED').length;
                        const inProgressCount = d.towers.filter((t: any) => t.status === 'IN_PROGRESS').length;
                        const totalProgress = d.towers.reduce((acc: number, t: any) => acc + Number(t.progress || 0), 0);

                        let combinedStatus: ActivityStatus = 'PENDING';
                        if (finishedCount === d.towers.length) combinedStatus = 'FINISHED';
                        else if (inProgressCount > 0 || finishedCount > 0) combinedStatus = 'IN_PROGRESS';

                        return {
                            isScheduled: true,
                            towers: d.towers,
                            combinedStatus,
                            avgProgress: d.towers.length > 0 ? Math.round(totalProgress / d.towers.length) : 0
                        };
                    })
                };
            });

        rowsList.sort((a, b) => (a.categoryOrder - b.categoryOrder) || (a.activityOrder - b.activityOrder));

        // Calculate Daily Totals
        const dailyTotals = daysList.map((_, dIdx) => {
            let towerCount = 0;
            let totalQuantity = 0;
            rowsList.forEach(row => {
                const day = row.daySchedules[dIdx];
                if (day.isScheduled) {
                    towerCount += day.towers.length;
                    totalQuantity += day.towers.reduce((acc: number, t: any) => acc + (t.plannedQuantity || 0), 0);
                }
            });
            return { towerCount, totalQuantity };
        });

        return { activeWeekDays: daysList, rows: rowsList, dailyTotals };

    }, [towers, categories, activeWeekId, weeks, showAllActivities]);

    const { activeWeekDays, rows, dailyTotals } = lookAheadData;

    const activeWeek = weeks.find(w => w.id === activeWeekId);


    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Week Tab Selector */}
            <div className="grid grid-cols-6 gap-2 bg-slate-900/40 p-2 rounded-xl border border-white/5 backdrop-blur-md">
                {weeks.map(week => (
                    <button
                        key={week.id}
                        onClick={() => setActiveWeekId(week.id)}
                        className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-lg border transition-all relative overflow-hidden group",
                            activeWeekId === week.id
                                ? "bg-amber-500/10 border-amber-500/50 shadow-glow-sm"
                                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                        )}
                    >
                        {activeWeekId === week.id && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-glow" />
                        )}
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest transition-colors",
                            activeWeekId === week.id ? "text-amber-500" : "text-slate-500 group-hover:text-slate-300"
                        )}>
                            S{week.id}
                        </span>
                        <span className={cn(
                            "text-[9px] font-bold font-mono transition-colors",
                            activeWeekId === week.id ? "text-white" : "text-slate-600 group-hover:text-slate-400"
                        )}>
                            {week.dateRange}
                        </span>
                    </button>
                ))}
            </div>

            {/* Matrix Header / Controls */}
            <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 backdrop-blur-md h-16">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 border-r border-white/5 pr-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <CalendarDays className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Visão Diária Detalhada</h3>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">{activeWeek?.label} — {activeWeek?.dateRange}</p>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        variant="link"
                        className="text-[9px] font-black uppercase text-amber-500 hover:text-amber-400 gap-2 h-auto p-0"
                        onClick={() => activeWeek && onWeekClick?.(activeWeek.start)}
                    >
                        <Plus className="w-3 h-3" />
                        Programar p/ Lote nesta semana
                    </Button>
                </div>

                <div className="flex items-center gap-6">
                    <Button
                        variant={showAllActivities ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setShowAllActivities(!showAllActivities)}
                        className="text-[10px] uppercase font-black tracking-widest h-8"
                    >
                        {showAllActivities ? "Ocultar Vazios" : "Ver Tudo"}
                    </Button>

                    {/* Bulk Actions Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-400 hover:text-white hover:bg-white/5">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-950 border-white/10 w-56">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ações da Matriz</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem
                                className="text-xs font-bold text-slate-300 focus:text-white focus:bg-white/5 cursor-pointer gap-2 my-1"
                                onClick={() => confirmDelete('week', undefined, activeWeekId)}
                            >
                                <CalendarX2 className="w-3.5 h-3.5" />
                                <span>Limpar Semana {activeWeekId}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem
                                className="text-xs font-bold text-red-500 focus:text-red-400 focus:bg-red-500/10 cursor-pointer gap-2 my-1"
                                onClick={() => confirmDelete('all')}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Limpar TUDO (6 Semanas)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-xs font-bold text-red-600 focus:text-red-500 focus:bg-red-500/20 cursor-pointer gap-2 my-1"
                                onClick={() => confirmDelete('project_all')}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>LIMPAR PROJETO INTEIRO</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700 shadow-glow-none" /> Pendente</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500 shadow-glow-sm" /> Andamento</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow-sm" /> Concluído</div>
                    </div>
                </div>
            </div>

            <ScrollArea className="h-[calc(100vh-380px)] border border-white/5 rounded-xl bg-black/40 shadow-2xl overflow-hidden">
                <Table className="border-collapse">
                    <TableHeader className="bg-slate-950/80 sticky top-0 z-20 backdrop-blur-xl">
                        <TableRow className="hover:bg-transparent border-white/10">
                            <TableHead className="w-[240px] bg-slate-950/90 border-r border-white/5 text-[10px] font-black uppercase text-amber-500 py-6 px-4 sticky left-0 z-30">
                                Atividade / Categoria
                            </TableHead>
                            {activeWeekDays.map((day, dIdx) => (
                                <TableHead key={dIdx} className="min-w-[120px] text-center p-0 border-l border-white/5">
                                    <div className="flex flex-col items-center py-4 gap-1 group/header relative">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">{dIdx + 1}</span>
                                            <span className="text-[11px] font-black uppercase tracking-tighter text-slate-300">{day.shortLabel}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-amber-500/70 font-mono tracking-widest">{day.dayNum}</span>

                                        {/* Daily Summary */}
                                        {dailyTotals[dIdx] && dailyTotals[dIdx].towerCount > 0 && (
                                            <div className="flex flex-col items-center mt-1 pt-1 border-t border-white/5 w-full">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">T: {dailyTotals[dIdx].towerCount}</span>
                                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Q: {dailyTotals[dIdx].totalQuantity}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Day Clear Button */}
                                        <button
                                            onClick={() => confirmDelete('day', day.date)}
                                            className="absolute top-1 right-1 p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-500 opacity-0 group-hover/header:opacity-100 transition-all"
                                            title="Limpar dia"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-30 grayscale group">
                                        <CalendarDays className="w-10 h-10 text-slate-500 transition-transform group-hover:scale-110" />
                                        <p className="text-[10px] font-black uppercase text-slate-700 tracking-[0.4em] font-mono">
                                            Nenhuma atividade programada para {activeWeek?.label}
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAllActivities(true)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] uppercase font-bold"
                                        >
                                            Mostrar Todas as Atividades para Agendar
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, idx) => (
                                <TableRow key={idx} className="group hover:bg-slate-900/60 border-white/5 transition-all h-24">
                                    <TableCell className="w-[240px] bg-slate-950/40 border-r border-white/5 py-4 px-4 sticky left-0 z-10 group-hover:bg-slate-900 shadow-2xl">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-100 uppercase tracking-tighter group-hover:text-amber-500 transition-colors">
                                                {row.activityName}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[200px] leading-tight mt-1 opacity-60">
                                                {row.categoryName}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {row.daySchedules.map((cell: any, dIdx: number) => (
                                        <TableCell key={dIdx} className="p-1 border-l border-white/5 text-center relative overflow-hidden group/cell">
                                            {cell.isScheduled ? (
                                                <TooltipProvider>
                                                    <Tooltip delayDuration={0}>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className={cn(
                                                                    "h-full w-full rounded-xl flex flex-col items-center justify-center p-2 gap-1.5 transition-all shadow-lg border cursor-pointer relative",
                                                                    cell.combinedStatus === 'FINISHED' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                                                        cell.combinedStatus === 'IN_PROGRESS' ? 'bg-amber-500/10 border-amber-500/30 shadow-amber-500/10' :
                                                                            'bg-slate-800/30 border-white/5'
                                                                )}
                                                                onClick={() => {
                                                                    // Open daily status or edit (future: daily detail modal)
                                                                    if (onEditActivity && cell.towers.length === 1) {
                                                                        onEditActivity(cell.towers[0].id, row.activityId);
                                                                    }
                                                                }}
                                                            >
                                                                {/* Tower Tags */}
                                                                <div className="flex flex-wrap gap-1 justify-center max-w-full overflow-hidden items-center">
                                                                    {cell.towers.slice(0, 3).map((t: any) => (
                                                                        <span key={t.id} className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-slate-200 uppercase tracking-tighter">
                                                                            {t.name}
                                                                        </span>
                                                                    ))}
                                                                    {cell.towers.length > 3 && (
                                                                        <span className="text-[8px] font-black text-amber-500">+{cell.towers.length - 3}</span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    {cell.combinedStatus === 'FINISHED' ? (
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                    ) : (
                                                                        <span className={cn(
                                                                            "text-[10px] font-black tabular-nums",
                                                                            cell.combinedStatus === 'IN_PROGRESS' ? 'text-amber-500' : 'text-slate-500'
                                                                        )}>
                                                                            {cell.avgProgress}%
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Progress Bar Micro-Indicator */}
                                                                <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden shrink-0">
                                                                    <div
                                                                        className={cn(
                                                                            "h-full transition-all duration-700 ease-out",
                                                                            cell.combinedStatus === 'FINISHED' ? 'bg-emerald-500' : 'bg-amber-500'
                                                                        )}
                                                                        style={{ width: `${cell.avgProgress}%` }}
                                                                    />
                                                                </div>

                                                                {/* Helper Buttons Container */}
                                                                <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 opacity-0 group-hover/cell:opacity-100 transition-all z-20">
                                                                    {/* Delete Button */}
                                                                    <button
                                                                        className="p-1 rounded-full bg-black/50 hover:bg-red-500 hover:text-white border border-white/10 text-slate-400 transition-all scale-75 hover:scale-100"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const dayDate = activeWeekDays[dIdx].date;
                                                                            confirmDelete('day', dayDate, undefined, row.activityId);
                                                                        }}
                                                                        title="Remover agendamento deste dia"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>

                                                                    {/* Add Button */}
                                                                    <button
                                                                        className="p-1 rounded-full bg-black/50 hover:bg-amber-500 hover:text-black border border-white/10 text-slate-300 transition-all scale-75 hover:scale-100"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const dayDate = activeWeekDays[dIdx].date;
                                                                            const dateStr = format(dayDate, "yyyy-MM-dd'T'12:00:00");
                                                                            onEditActivity?.('', row.activityId, dateStr, dateStr);
                                                                        }}
                                                                        title="Adicionar mais torres"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-slate-950 border-white/10 p-3 shadow-3xl z-50 rounded-xl" side="bottom">
                                                            <div className="space-y-2 min-w-[180px]">
                                                                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{activeWeekDays[dIdx].label}</span>
                                                                    <span className="text-[10px] font-black text-slate-500">{cell.towers.length} Torres</span>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    {cell.towers.map((t: any) => (
                                                                        <div key={t.id} className="flex items-center justify-between gap-4 p-1 rounded hover:bg-white/5 transition-colors">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={cn(
                                                                                    "w-1.5 h-1.5 rounded-full",
                                                                                    t.status === 'FINISHED' ? 'bg-emerald-500' :
                                                                                        t.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-slate-700'
                                                                                )} />
                                                                                <span className="text-[10px] font-black text-slate-100 uppercase">{t.name}</span>
                                                                                {t.plannedQuantity > 0 && (
                                                                                    <span className="text-[9px] font-black text-emerald-500/80">Q: {t.plannedQuantity}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[9px] font-black text-slate-400 font-mono">{t.progress}%</span>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (t.scheduleId) {
                                                                                            const dayDate = activeWeekDays[dIdx].date;
                                                                                            const dateStr = format(dayDate, "yyyy-MM-dd");
                                                                                            deleteUnitaryMutation.mutate({ scheduleId: t.scheduleId, targetDate: dateStr });
                                                                                        }
                                                                                    }}
                                                                                    className="p-1 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-colors"
                                                                                    title="Remover agendamento desta torre neste dia"
                                                                                >
                                                                                    <CalendarX2 className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="pt-2 text-[8px] text-slate-600 font-bold uppercase tracking-widest text-center border-t border-white/5">Detalhes da Execução</div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                /* Add button only visible on row hover or cell hover */
                                                <div className="h-full w-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        className="h-8 w-8 rounded-full bg-white/5 border border-white/5 hover:bg-amber-500 hover:text-black flex items-center justify-center transition-all scale-75 group-hover/cell:scale-100"
                                                        onClick={() => {
                                                            const dayDate = activeWeekDays[dIdx].date;
                                                            // Use noon to avoid timezone shift
                                                            const dateStr = format(dayDate, "yyyy-MM-dd'T'12:00:00");
                                                            onEditActivity?.('', row.activityId, dateStr, dateStr);
                                                        }}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>


                                            )}

                                        </TableCell>

                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Visual Glow Ends */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-slate-950 to-transparent pointer-events-none"></div>
            </ScrollArea>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="bg-slate-950 border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Confirmar Limpeza de Cronograma
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            {deleteType === 'day' && !deleteTargetActivityId && `Tem certeza que deseja remover TODOS os agendamentos do dia ${deleteTargetDate ? format(deleteTargetDate, 'dd/MM') : ''}?`}
                            {deleteType === 'day' && deleteTargetActivityId && `Tem certeza que deseja remover os agendamentos desta atividade no dia ${deleteTargetDate ? format(deleteTargetDate, 'dd/MM') : ''}?`}
                            {deleteType === 'week' && `Tem certeza que deseja remover TODOS os agendamentos da Semana ${activeWeekId}?`}
                            {deleteType === 'all' && "ATENÇÃO: Isso removerá TODOS os agendamentos das próximas 6 SEMANAS. Essa ação não pode ser desfeita."}
                            {deleteType === 'project_all' && "⚠️ PERIGO EXTREMO: Isso removerá ABSOLUTAMENTE TODAS as programações deste PROJETO, independente da data. Use apenas se tiver certeza absoluta!"}
                            <br /><br />
                            <span className="font-bold text-red-500/80 uppercase text-xs tracking-wider">Essa ação é irreversível.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white uppercase text-xs font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!deleteType) return;
                                toast.info("Iniciando limpeza em segundo plano...");
                                clearScheduleMutation.mutate({
                                    type: deleteType,
                                    targetWeekId: deleteTargetWeekId ?? undefined,
                                    targetDate: deleteTargetDate ?? undefined,
                                    activityId: deleteTargetActivityId ?? undefined
                                });
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white border-0 uppercase text-xs font-black tracking-widest"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Confirmar Limpeza
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
