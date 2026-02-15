import React, { useState } from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { CalendarIcon, Loader2, Check, ChevronsUpDown, User, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityStatus, TowerActivityStatus, LandStatus, ImpedimentType, ActivitySchedule } from "../types";
import { orionApi } from "@/integrations/orion/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/useEmployees";
import { show, isSystemAdminSignal } from "@/signals/authSignals";
import { useAuth } from "@/contexts/AuthContext";

// Sub-componentes Refatorados (SRP)
import { StatusTab } from "./ActivityStatusModal/StatusTab";
import { HistoryTab } from "./ActivityStatusModal/HistoryTab";
import { ScheduleSection } from "./ActivityStatusModal/ScheduleSection";

interface ActivityStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    elementId: string;
    towerName: string;
    towerType: string | null;
    activityId: string;
    activityName: string;
    currentStatus?: TowerActivityStatus;
    projectId?: string;
}

interface HistoryLog {
    id: string;
    elementId: string;
    activityId: string;
    status: string;
    progressPercent: number;
    notes: string;
    logTimestamp: string;
    userName: string;
    requiresApproval?: boolean;
    isApproved?: boolean;
    approvedAt?: string;
}

interface DelayReason {
    id: string;
    name: string;
    category: string;
}

const ActivityStatusModal = React.memo(({
    isOpen,
    onClose,
    elementId,
    towerName,
    towerType,
    activityId,
    activityName,
    currentStatus,
    projectId
}: ActivityStatusModalProps) => {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    // Estado Principal
    const [status, setStatus] = useState<ActivityStatus>(currentStatus?.status || 'PENDING');
    const [landStatus, setLandStatus] = useState<LandStatus>(currentStatus?.landStatus || 'FREE');
    const [impedimentType, setImpedimentType] = useState<ImpedimentType>(currentStatus?.impedimentType || 'NONE');
    const [progressPercent, setProgressPercent] = useState<number>(currentStatus?.progressPercent || 0);
    const [startDate, setStartDate] = useState<Date | undefined>(
        currentStatus?.startDate ? new Date(currentStatus.startDate) : undefined
    );
    const [endDate, setEndDate] = useState<Date | undefined>(
        currentStatus?.endDate ? new Date(currentStatus.endDate) : undefined
    );
    const [notes, setNotes] = useState(currentStatus?.notes || "");
    const [foremanName, setForemanName] = useState<string>(currentStatus?.metadata?.leadName || "");
    const [foremanSearchOpen, setForemanSearchOpen] = useState(false);
    const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
    const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

    // Estado de Planejamento
    const [plannedStart, setPlannedStart] = useState<Date | undefined>();
    const [plannedEnd, setPlannedEnd] = useState<Date | undefined>();
    const [plannedQuantity, setPlannedQuantity] = useState<string>("");
    const [plannedHours, setPlannedHours] = useState<string>("");
    const [selectedReasonId, setSelectedReasonId] = useState<string>("");

    const { employees } = useEmployees();

    // Consultas
    const { data: history = [], isLoading: isLoadingHistory } = useQuery<HistoryLog[]>({
        queryKey: ["production-logs", elementId, activityId],
        queryFn: async () => {
            const res = await orionApi.get<HistoryLog[]>(`/production/logs?elementId=${elementId}&activityId=${activityId}`);
            return res.data || [];
        },
        enabled: isOpen && !!elementId && !!activityId,
    });

    const { data: scheduleData } = useQuery<ActivitySchedule | null>({
        queryKey: ["production-schedule", elementId, activityId],
        queryFn: async () => {
            const res = await orionApi.get<ActivitySchedule[]>(`/production/schedule?elementId=${elementId}`);
            if (res.data && Array.isArray(res.data)) {
                return res.data.find((s: { activityId: string }) => s.activityId === activityId) || null;
            }
            return null;
        },
        enabled: isOpen && !!elementId && !!activityId,
    });

    const { data: delayReasons = [] } = useQuery<DelayReason[]>({
        queryKey: ["delay-reasons", elementId],
        queryFn: async () => {
            const res = await orionApi.get<DelayReason[]>(`/production/delay-reasons?projectId=${projectId}`);
            return res.data || [];
        },
        enabled: isOpen && !!projectId && projectId !== 'all'
    });

    // Efeitos
    React.useEffect(() => {
        if (scheduleData) {
            if (scheduleData.plannedStart) setPlannedStart(new Date(scheduleData.plannedStart));
            if (scheduleData.plannedEnd) setPlannedEnd(new Date(scheduleData.plannedEnd));
            if (scheduleData.plannedQuantity) setPlannedQuantity(scheduleData.plannedQuantity.toString());
            if (scheduleData.plannedHours) setPlannedHours(scheduleData.plannedHours.toString());
        }
    }, [scheduleData]);

    const leaders = React.useMemo(() =>
        employees.filter(e => e.canLeadTeam || e.professionalLevel >= 3)
        , [employees]);

    const isFoundation = React.useMemo(() =>
        ["fundação", "escavação", "armação", "concretagem", "reaterro"].some(v => activityName.toLowerCase().includes(v))
        , [activityName]);

    const componentLabels = React.useMemo(() => {
        const isEstaiada = towerType?.toLowerCase().includes("estaiada");
        return isEstaiada
            ? ["Mastro", "Estai A", "Estai B", "Estai C", "Estai D"]
            : ["Pé A", "Pé B", "Pé C", "Pé D"];
    }, [towerType]);

    const [components, setComponents] = useState<Record<string, ActivityStatus>>(
        currentStatus?.metadata?.components ||
        Object.fromEntries(componentLabels.map(label => [label, 'PENDING']))
    );

    const approveMutation = useMutation({
        mutationFn: async ({ progressId, logTimestamp }: { progressId: string, logTimestamp: string }) => {
            return orionApi.post("/production/logs", { progressId, logTimestamp: String(logTimestamp) });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-logs", elementId, activityId] });
            toast.success("Log aprovado com sucesso");
        },
        onError: (error: Error | any) => {
            const message = error.response?.data?.message || error.message || "Erro desconhecido";
            toast.error("Erro ao aprovar log: " + message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
             // 1. Automations for FINISHED status
            const finalStatus = status;
            let finalProgress = progressPercent;
            let finalStartDate = startDate;
            let finalEndDate = endDate;

            if (finalStatus === 'FINISHED') {
                finalProgress = 100;
                // Auto-fill dates if missing
                if (!finalStartDate) finalStartDate = new Date();
                if (!finalEndDate) finalEndDate = new Date();
            }

            // 2. Date Validation
            if (finalStartDate && finalEndDate) {
                if (finalStartDate > finalEndDate) {
                    toast.error("A data de início real não pode ser maior que a data de fim real.");
                    throw new Error("Validation failed: StartDate > EndDate");
                }
            }

            // 3. Validation for Pending Reason
            if (finalStatus === 'PENDING' && notes.length < 10 && foremanName === "none") {
                toast.error("Status 'Pendente' exige justificativa nas observações ou programação.");
                throw new Error("Validation failed");
            }

            let isRegression = false;
            let regressionMsg = "";
            if (currentStatus) {
                if (currentStatus.progressPercent && finalProgress < currentStatus.progressPercent && finalStatus !== 'PENDING') {
                    isRegression = true;
                    regressionMsg = `Redução de avanço detectada (${currentStatus.progressPercent}% -> ${finalProgress}%).`;
                }
                if (currentStatus.startDate && !finalStartDate) {
                    isRegression = true;
                    regressionMsg += " Remoção de data de início.";
                }
            }

            if (isRegression && notes.length < 5) {
                toast.error("Detectada regressão de dados. É OBRIGATÓRIO informar uma justificativa.");
                throw new Error("Validation failed");
            }

            const payload = {
                elementId,
                activityId,
                status: finalStatus,
                landStatus,
                impedimentType,
                foremanName,
                progressPercent: finalProgress,
                startDate: finalStartDate?.toISOString(),
                endDate: finalEndDate?.toISOString(),
                notes,
                requiresApproval: isRegression,
                approvalReason: isRegression ? regressionMsg : null,
                metadata: {
                    components: isFoundation ? components : undefined,
                    leadName: foremanName
                }
            };

            // 4. Automation: Planning Dates fallback
            // If planning dates are missing, use execution dates
            let finalPlannedStart = plannedStart;
            let finalPlannedEnd = plannedEnd;

            if (!finalPlannedStart && finalStartDate) finalPlannedStart = finalStartDate;
            if (!finalPlannedEnd && finalEndDate) finalPlannedEnd = finalEndDate;

            if (finalPlannedStart && finalPlannedEnd) {
                const toNoon = (d: Date) => new Date(d.setHours(12, 0, 0, 0)).toISOString();
                await orionApi.post("/production/schedule", {
                    towerId: elementId,
                    activityId,
                    plannedStart: toNoon(finalPlannedStart),
                    plannedEnd: toNoon(finalPlannedEnd),
                    plannedQuantity: plannedQuantity ? parseFloat(plannedQuantity) : null,
                    plannedHHH: plannedHours ? parseFloat(plannedHours) : null
                });
            }

            const response = await orionApi.post("/production/tower-status", payload);
            return response.data;
        },
        onSuccess: () => {
            ["production-towers", "production-schedule", "production-logs"].forEach(k =>
                queryClient.invalidateQueries({ queryKey: [k] })
            );
            toast.success("Dados atualizados com sucesso");
            onClose();
        },
        
    });

    React.useEffect(() => {
        if (!isFoundation) return;
        const total = Object.keys(components).length;
        if (total === 0) return;
        const finished = Object.values(components).filter(s => s === 'FINISHED').length;
        const calc = Math.round((finished / total) * 100);
        
        // Só atualiza o slider se a mudança veio dos componentes (evita loops se o slider mudar o componente)
        if (status !== 'FINISHED' && progressPercent !== calc && !isProgressionLock.current) {
            setProgressPercent(calc);
        }
    }, [components, isFoundation, status, progressPercent]);

    // Ref para evitar loops infinitos entre progresso e componentes
    const isProgressionLock = React.useRef(false);

    React.useEffect(() => {
        if (!isFoundation) return;
        
        // Se o progresso for 100% ou status for FINISHED, garante que todos os componentes estejam concluídos
        if (progressPercent === 100 || status === 'FINISHED') {
            const needsUpdate = Object.values(components).some(s => s !== 'FINISHED');
            if (needsUpdate) {
                isProgressionLock.current = true;
                setComponents(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(key => { next[key] = 'FINISHED'; });
                    return next;
                });
                // Liberar o lock após o próximo ciclo de render
                setTimeout(() => { isProgressionLock.current = false; }, 100);
            }
        }
    }, [progressPercent, status, isFoundation, components]);

    const toggleComponentStatus = React.useCallback((label: string) => {
        setComponents(prev => {
            const current = prev[label];
            const next: ActivityStatus = current === 'PENDING' ? 'IN_PROGRESS' : current === 'IN_PROGRESS' ? 'FINISHED' : 'PENDING';
            return { ...prev, [label]: next };
        });
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] p-0 border-white/5 bg-slate-950/90 backdrop-blur-3xl text-slate-100 overflow-hidden rounded-4xl shadow-2xl">
                {/* Efeito de Brilho de Fundo */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

                <Tabs defaultValue="status" className="w-full relative z-10">
                    <div className="px-8 pt-8 pb-4 border-b border-white/5 space-y-5 bg-linear-to-b from-white/2 to-transparent">
                        <DialogHeader className="p-0">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="flex flex-col gap-1">
                                    <span className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
                                        {towerName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[8px] font-black tracking-widest bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                                            {activityName}
                                        </Badge>
                                        <span className="text-[10px] text-white/20 font-mono tracking-tighter">ID: {elementId?.slice(-8).toUpperCase()}</span>
                                    </div>
                                </DialogTitle>
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-slate-400">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <DialogDescription className="text-[10px] uppercase font-black tracking-widest text-slate-500 pt-2">
                                Gestão de Produção Unificada
                            </DialogDescription>
                        </DialogHeader>

                        <TabsList className="bg-black/40 border border-white/5 w-full h-11 p-1 rounded-xl">
                            <TabsTrigger value="status" className="flex-1 text-[10px] uppercase font-black tracking-widest data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 rounded-lg transition-all">Status & Avanço</TabsTrigger>
                            <TabsTrigger value="history" className="flex-1 text-[10px] uppercase font-black tracking-widest data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 rounded-lg transition-all">Histórico de Logs</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="status" className="m-0 focus-visible:outline-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
                            {/* Componente de Liderança - Premium Look */}
                            <div className="grid gap-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <User className="w-3 h-3 text-amber-500" /> Encarregado
                                </Label>
                                <Popover open={foremanSearchOpen} onOpenChange={setForemanSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-12 w-full justify-between bg-white/3 border-white/5 text-slate-200 px-4 rounded-xl hover:bg-white/6 transition-all">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs truncate">
                                                    {foremanName && foremanName !== "none" ? foremanName : "Selecionar responsável..."}
                                                </span>
                                            </div>
                                            <ChevronsUpDown className="h-4 w-4 opacity-30" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 bg-slate-900 border-white/10 shadow-2xl rounded-2xl" align="start">
                                        <Command className="bg-transparent text-slate-100">
                                            <CommandInput placeholder="Procurar líder..." className="h-11 border-none focus:ring-0 text-sm" />
                                            <CommandList className="max-h-[300px] custom-scrollbar">
                                                <CommandEmpty className="py-8 text-center text-xs text-slate-500">Ninguém encontrado.</CommandEmpty>
                                                <CommandGroup heading="Liderança de Campo">
                                                    <CommandItem value="none" onSelect={() => { setForemanName("none"); setForemanSearchOpen(false); }} className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/5 rounded-lg m-1">
                                                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center"><X className="w-3 h-3" /></div> 
                                                        <span className="font-bold text-xs uppercase tracking-widest">Nenhum</span>
                                                        <Check className={cn("ml-auto h-4 w-4", foremanName === "none" ? "opacity-100" : "opacity-0")} />
                                                    </CommandItem>
                                                    {leaders.map((leader) => (
                                                        <CommandItem key={leader.id} value={leader.fullName} onSelect={() => { setForemanName(leader.fullName); setForemanSearchOpen(false); }} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-lg m-1 group">
                                                            <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                                                <User className="w-3 h-3 text-amber-500" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-black group-hover:text-amber-500 transition-colors truncate uppercase italic">{leader.fullName}</span>
                                                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{leader.functionName || 'Encarregado'}</span>
                                                            </div>
                                                            <Check className={cn("ml-auto h-4 w-4 text-amber-500", foremanName === leader.fullName ? "opacity-100" : "opacity-0")} />
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <StatusTab
                                status={status} setStatus={setStatus}
                                landStatus={landStatus} setLandStatus={setLandStatus}
                                selectedReasonId={selectedReasonId} setSelectedReasonId={setSelectedReasonId}
                                setImpedimentType={setImpedimentType}
                                delayReasons={delayReasons}
                                progressPercent={progressPercent} setProgressPercent={setProgressPercent}
                                isFoundation={isFoundation}
                                componentLabels={componentLabels}
                                components={components}
                                toggleComponentStatus={toggleComponentStatus}
                            />

                            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 bg-white/1 -mx-8 px-8 pb-4">
                                <div className="grid gap-2">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Início Real</Label>
                                    <Popover open={isStartPickerOpen} onOpenChange={setIsStartPickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="h-11 bg-white/3 border-white/5 justify-start text-[11px] font-black tracking-tight rounded-xl hover:bg-white/10">
                                                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-sky-500" />
                                                {startDate ? format(startDate, "dd/MM/yyyy") : "DEFINIR DATA"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 rounded-2xl shadow-2xl">
                                            <Calendar 
                                                mode="single" 
                                                selected={startDate} 
                                                onSelect={(date) => {
                                                    setStartDate(date);
                                                    setIsStartPickerOpen(false);
                                                }} 
                                                className="bg-transparent text-slate-100" 
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Fim Real</Label>
                                    <Popover open={isEndPickerOpen} onOpenChange={setIsEndPickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="h-11 bg-white/3 border-white/5 justify-start text-[11px] font-black tracking-tight rounded-xl hover:bg-white/10">
                                                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-sky-500" />
                                                {endDate ? format(endDate, "dd/MM/yyyy") : "DEFINIR DATA"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 rounded-2xl shadow-2xl">
                                            <Calendar 
                                                mode="single" 
                                                selected={endDate} 
                                                onSelect={(date) => {
                                                    setEndDate(date);
                                                    setIsEndPickerOpen(false);
                                                }} 
                                                className="bg-transparent text-slate-100" 
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {show('showProjectManagement') && (
                                <ScheduleSection
                                    plannedStart={plannedStart} setPlannedStart={setPlannedStart}
                                    plannedEnd={plannedEnd} setPlannedEnd={setPlannedEnd}
                                    plannedQuantity={plannedQuantity} setPlannedQuantity={setPlannedQuantity}
                                    plannedHours={plannedHours} setPlannedHours={setPlannedHours}
                                />
                            )}

                            <div className="grid gap-3 pt-2">
                                <div className="flex justify-between items-center px-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-amber-500" /> Justificativa / Notas
                                    </Label>
                                    {status === 'PENDING' && <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/5 border-amber-500/20 px-2 h-4 rounded-full">Obrigatória</Badge>}
                                </div>
                                <Textarea
                                    placeholder="Descreva detalhes de campo, dificuldades ou observações técnicas..."
                                    className="bg-white/3 border-white/5 text-slate-200 text-xs min-h-[80px] rounded-xl focus:border-amber-500/30 transition-all placeholder:text-slate-700 p-4"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter className="px-8 py-6 border-t border-white/5 bg-white/2 flex flex-row items-center justify-between gap-4">
                            <Button variant="ghost" size="sm" onClick={onClose} disabled={updateMutation.isPending} className="text-slate-500 hover:text-white hover:bg-white/5 font-black h-11 px-6 text-[10px] uppercase tracking-widest rounded-xl transition-all">CANCEL</Button>
                            
                            {(show('production.canRegisterAdvance') || 
                              isSystemAdminSignal.value || 
                              profile?.isSystemAdmin || 
                              ['SUPER_ADMIN_GOD', 'SUPERADMINGOD', 'SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'TI_SOFTWARE', 'TISOFTWARE', 'HELPER_SYSTEM'].includes(profile?.role || '')) && (
                                <Button 
                                    size="sm" 
                                    onClick={() => updateMutation.mutate()} 
                                    disabled={updateMutation.isPending} 
                                    className="bg-amber-600 hover:bg-amber-500 text-black font-black px-8 h-12 text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_40px_rgba(217,119,6,0.2)] hover:shadow-[0_10px_40px_rgba(217,119,6,0.4)] transition-all hover:scale-[1.02] active:scale-95 rounded-xl border border-white/10"
                                >
                                    {updateMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    Registrar Avanço
                                </Button>
                            )}
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="history" className="m-0 focus-visible:outline-hidden">
                        <HistoryTab isLoadingHistory={isLoadingHistory} history={history} approveMutation={approveMutation} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
});

export default ActivityStatusModal;
