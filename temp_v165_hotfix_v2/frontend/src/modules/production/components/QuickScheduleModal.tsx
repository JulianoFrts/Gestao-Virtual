import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { CalendarIcon, Loader2, Check, User, ChevronsUpDown, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { orionApi } from "@/integrations/orion/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/useEmployees";

/**
 * Parse date string preserving local day (avoids UTC timezone shift)
 * Input: "2026-01-26T12:00:00" or ISO strings
 * Output: Date object at noon LOCAL time for the same calendar day
 */
const parseLocalDate = (dateStr: string): Date => {
    // Extract just the date part (YYYY-MM-DD)
    const datePart = dateStr.substring(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date at NOON local time to avoid any timezone boundary issues
    return new Date(year, month - 1, day, 12, 0, 0, 0);
};

interface QuickScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    towerId: string;
    towerName: string;
    activityId: string;
    activityName: string;
    projectId?: string;
    initialPlannedStart?: string;
    initialPlannedEnd?: string;
    availableTowers?: any[]; // For when we need to pick a tower
}

const QuickScheduleModal = ({
    isOpen,
    onClose,
    towerId,
    towerName,
    activityId,
    activityName,
    projectId,
    initialPlannedStart,
    initialPlannedEnd,
    availableTowers
}: QuickScheduleModalProps) => {
    const queryClient = useQueryClient();
    const { employees } = useEmployees();

    const [plannedStart, setPlannedStart] = useState<Date | undefined>(
        initialPlannedStart ? parseLocalDate(initialPlannedStart) : undefined
    );
    const [plannedEnd, setPlannedEnd] = useState<Date | undefined>(
        initialPlannedEnd ? parseLocalDate(initialPlannedEnd) : undefined
    );
    const [plannedQuantity, setPlannedQuantity] = useState<string>("");
    const [plannedHours, setPlannedHours] = useState<string>("");
    const [foremanName, setForemanName] = useState<string>("none");
    const [foremanSearchOpen, setForemanSearchOpen] = useState(false);

    // New state for tower selection if not provided
    const [selectedTower, setSelectedTower] = useState<{ id: string, name: string } | null>(
        towerId ? { id: towerId, name: towerName } : null
    );
    const [towerSearchOpen, setTowerSearchOpen] = useState(false);

    // Fetch existing schedule only
    const { data: scheduleData, isLoading: isLoadingSchedule } = useQuery({
        queryKey: ["production-schedule", selectedTower?.id, activityId],
        queryFn: async () => {
            if (!selectedTower?.id) return null;
            const res = await orionApi.get(`/production/schedule?towerId=${selectedTower.id}`);
            if (res.data && Array.isArray(res.data)) {
                const found = (res.data as any[]).find((s: any) => s.activityId === activityId);
                return found || null;
            }
            return null;
        },
        enabled: isOpen && !!selectedTower?.id && !!activityId,
    });

    // Fetch current status to get leadName
    const { data: statusData } = useQuery({
        queryKey: ["production-status", selectedTower?.id, activityId],
        queryFn: async () => {
            if (!selectedTower?.id) return null;
            const res = await orionApi.get(`/production/tower-status?towerId=${selectedTower.id}`);
            if (res.data && Array.isArray(res.data)) {
                const found = (res.data as any[]).find((s: any) => s.activityId === activityId);
                return found || null;
            }
            return null;
        },
        enabled: isOpen && !!selectedTower?.id && !!activityId,
    });

    useEffect(() => {
        if (scheduleData) {
            // Only overwrite dates if we are editing an existing item (initial towerId was provided)
            const isEditing = !!towerId;

            if (isEditing) {
                if (scheduleData.plannedStart) setPlannedStart(parseLocalDate(scheduleData.plannedStart));
                if (scheduleData.plannedEnd) setPlannedEnd(parseLocalDate(scheduleData.plannedEnd));
            }

            // Always load other metadata to help user
            if (scheduleData.plannedQuantity) setPlannedQuantity(scheduleData.plannedQuantity.toString());
            if (scheduleData.plannedHHH) setPlannedHours(scheduleData.plannedHHH.toString());
        }
        if (statusData?.metadata?.leadName) {
            setForemanName(statusData.metadata.leadName);
        }
    }, [scheduleData, statusData, towerId]);

    const leaders = React.useMemo(() =>
        employees.filter(e => e.canLeadTeam || e.professionalLevel >= 3)
        , [employees]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!plannedStart || !plannedEnd) {
                toast.error("Datas de início e fim são obrigatórias.");
                throw new Error("Validation failed");
            }

            if (!selectedTower?.id) {
                toast.error("Selecione uma torre.");
                throw new Error("Validation failed");
            }

            // Parse numbers handling comma as decimal separator (PT-BR)
            const parseMeasure = (val: string) => {
                if (!val) return null;
                const normalized = val.replace(',', '.');
                const num = parseFloat(normalized);
                return isNaN(num) ? null : num;
            };

            // Helper: Normalize to Noon to avoid timezone shifting (e.g. 00:00 -> 21:00 previous day)
            const toNoonISO = (d: Date) => {
                const copy = new Date(d);
                copy.setHours(12, 0, 0, 0);
                return copy.toISOString();
            };

            // 1. Update Schedule
            await orionApi.post("/production/schedule", {
                towerId: selectedTower.id,
                activityId,
                plannedStart: toNoonISO(plannedStart),
                plannedEnd: toNoonISO(plannedEnd),
                plannedQuantity: parseMeasure(plannedQuantity),
                plannedHHH: parseMeasure(plannedHours)
            });

            // 2. Update status metadata (Encarregado) if changed
            if (foremanName !== "none") {
                await orionApi.post("/production/tower-status", {
                    towerId: selectedTower.id,
                    activityId,
                    status: statusData?.status || 'PENDING',
                    foremanName,
                    metadata: { leadName: foremanName }
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
            queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
            toast.success("Programação atualizada com sucesso");
            onClose();
        },
        onError: (error: any) => {
            if (error.message === "Validation failed") return;
            toast.error("Erro ao salvar programação: " + (error.response?.data?.message || error.message));
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] border-amber-500/20 bg-slate-950 text-slate-100 p-0 overflow-hidden shadow-2xl">
                <div className="bg-amber-500/10 p-6 border-b border-amber-500/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-lg font-black text-amber-500 uppercase tracking-widest">
                            <CalendarDays className="w-5 h-5" />
                            Programar Atividade
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                            {selectedTower?.name || 'Selecione a Torre'} — {activityName}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Seleção de Torre (se não fornecida) */}
                    {!towerId && (
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">Selecione a Torre</Label>
                            <Popover open={towerSearchOpen} onOpenChange={setTowerSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-11 w-full justify-between bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 px-4 text-xs font-bold"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ChevronsUpDown className="w-3.5 h-3.5 text-amber-500" />
                                            <span>{selectedTower ? selectedTower.name : "Selecionar Torre..."}</span>
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[340px] p-0 bg-slate-950 border-white/10 shadow-3xl z-50 overflow-hidden" align="start">
                                    <Command className="bg-slate-950 text-slate-200">
                                        <CommandInput placeholder="Procurar torre..." className="h-10 border-none uppercase" />
                                        <CommandList className="max-h-[250px] overflow-y-auto">
                                            <CommandEmpty className="py-6 text-center text-xs text-slate-500 uppercase font-black px-4">Nenhuma torre encontrada.</CommandEmpty>
                                            <CommandGroup heading="Estruturas do Projeto">
                                                {availableTowers?.map((t: any) => (
                                                    <CommandItem
                                                        key={t.id}
                                                        value={t.objectId}
                                                        onSelect={() => {
                                                            setSelectedTower({ id: t.id, name: t.objectId });
                                                            setTowerSearchOpen(false);
                                                        }}
                                                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 border-b border-white/5 font-bold uppercase"
                                                    >
                                                        <span className="text-xs">{t.objectId}</span>
                                                        <Check className={cn("ml-auto h-4 w-4 text-amber-500", selectedTower?.id === t.id ? "opacity-100" : "opacity-0")} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                    {/* Datas do Cronograma */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Início Planejado</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full h-11 bg-slate-900 border-slate-800 justify-start text-xs font-bold hover:bg-slate-800 transition-colors">
                                        <CalendarIcon className="mr-2 h-4 w-4 text-amber-500" />
                                        {plannedStart ? format(plannedStart, "dd/MM/yyyy") : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                                    <Calendar mode="single" selected={plannedStart} onSelect={setPlannedStart} className="bg-slate-900 text-slate-100" locale={ptBR} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fim Planejado</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full h-11 bg-slate-900 border-slate-800 justify-start text-xs font-bold hover:bg-slate-800 transition-colors">
                                        <CalendarIcon className="mr-2 h-4 w-4 text-amber-500" />
                                        {plannedEnd ? format(plannedEnd, "dd/MM/yyyy") : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                                    <Calendar mode="single" selected={plannedEnd} onSelect={setPlannedEnd} className="bg-slate-900 text-slate-100" locale={ptBR} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Encarregado */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Liderança Responsável</Label>
                        <Popover open={foremanSearchOpen} onOpenChange={setForemanSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-11 w-full justify-between bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 px-4 text-xs font-bold"
                                >
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-amber-500" />
                                        <span>{foremanName && foremanName !== "none" ? foremanName : "Selecionar Encarregado..."}</span>
                                    </div>
                                    <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[340px] p-0 bg-slate-900 border-slate-800 shadow-2xl" align="start">
                                <Command className="bg-slate-900 text-slate-200">
                                    <CommandInput placeholder="Procurar líder..." className="h-10 border-none" />
                                    <CommandList className="max-h-[250px] overflow-y-auto">
                                        <CommandEmpty className="py-6 text-center text-xs text-slate-500 uppercase font-black">Nenhum líder encontrado.</CommandEmpty>
                                        <CommandGroup heading="Corpo Técnico / Campo">
                                            <CommandItem value="none" onSelect={() => { setForemanName("none"); setForemanSearchOpen(false); }} className="flex items-center p-3 cursor-pointer hover:bg-slate-800">
                                                <span className="text-xs font-bold uppercase">Nenhum</span>
                                                <Check className={cn("ml-auto h-4 w-4 text-amber-500", foremanName === "none" ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                            {leaders.map((leader) => (
                                                <CommandItem
                                                    key={leader.id}
                                                    value={leader.fullName}
                                                    onSelect={() => { setForemanName(leader.fullName); setForemanSearchOpen(false); }}
                                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-800"
                                                >
                                                    <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                                        <User className="w-3 h-3 text-amber-500" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold uppercase tracking-tight text-white">{leader.fullName}</span>
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase">{leader.functionName || 'Encarregado'}</span>
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

                    {/* Quantidade e HHH */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Qtd. Planejada</Label>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full h-11 bg-slate-900 border border-slate-800 rounded-lg px-4 text-xs font-black text-white focus:outline-hidden focus:border-amber-500 transition-all font-mono"
                                value={plannedQuantity}
                                onChange={e => setPlannedQuantity(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">HHH Previsto</Label>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full h-11 bg-slate-900 border border-slate-800 rounded-lg px-4 text-xs font-black text-white focus:outline-hidden focus:border-amber-500 transition-all font-mono"
                                value={plannedHours}
                                onChange={e => setPlannedHours(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-slate-900/40 p-6 flex flex-row items-center justify-end gap-3 border-t border-white/5">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={saveMutation.isPending} className="text-slate-500 hover:text-white font-bold h-10 px-6 uppercase text-[10px]">
                        Cancelar
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="bg-amber-600 hover:bg-amber-500 text-black font-black px-10 h-10 text-[11px] uppercase tracking-widest shadow-glow"
                    >
                        {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Planejamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default QuickScheduleModal;
