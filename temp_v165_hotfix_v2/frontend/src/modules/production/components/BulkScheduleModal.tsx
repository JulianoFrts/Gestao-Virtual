import React, { useState, useMemo } from "react";
import { format, addDays, isSameDay } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, LayoutGrid, TowerControl as TowerIcon, CalendarDays, Loader2, User, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { TowerProductionData, ProductionCategory } from "../types";
import { orionApi } from "@/integrations/orion/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/useEmployees";

interface BulkScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    towers: TowerProductionData[];
    categories: ProductionCategory[];
    defaultStartDate?: Date;
    projectId?: string;
}

type Step = "activities" | "towers" | "config";

export default function BulkScheduleModal({
    isOpen,
    onClose,
    towers,
    categories,
    defaultStartDate = new Date(),
    projectId
}: BulkScheduleModalProps) {
    const queryClient = useQueryClient();
    const { employees } = useEmployees();
    const [step, setStep] = useState<Step>("activities");

    // Selection State
    const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
    const [selectedTowerIds, setSelectedTowerIds] = useState<string[]>([]);
    const [selectedDays, setSelectedDays] = useState<Date[]>([]);
    const [selectedForemanIds, setSelectedForemanIds] = useState<string[]>([]);
    const [plannedQuantity, setPlannedQuantity] = useState<string>("");

    // Search states
    const [towerSearch, setTowerSearch] = useState("");

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(defaultStartDate, i));
    }, [defaultStartDate]);

    const filteredTowers = useMemo(() => {
        return towers.filter(t =>
            t.objectId.toLowerCase().includes(towerSearch.toLowerCase()) ||
            t.trecho?.toLowerCase().includes(towerSearch.toLowerCase())
        );
    }, [towers, towerSearch]);

    const leaders = useMemo(() =>
        employees.filter(e => e.canLeadTeam || e.professionalLevel >= 3)
        , [employees]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (selectedActivityIds.length === 0 || selectedTowerIds.length === 0 || selectedDays.length === 0) {
                throw new Error("Preencha todos os campos obrigatórios.");
            }

            // Normalize to Noon to avoid timezone shifting
            const toNoonDate = (d: Date) => {
                const copy = new Date(d);
                copy.setHours(12, 0, 0, 0);
                return copy;
            };

            const startDate = toNoonDate(selectedDays.sort((a, b) => a.getTime() - b.getTime())[0]);
            const endDate = toNoonDate(selectedDays.sort((a, b) => a.getTime() - b.getTime())[selectedDays.length - 1]);

            for (const towerId of selectedTowerIds) {
                const tower = towers.find(t => t.id === towerId);
                for (const activityId of selectedActivityIds) {
                    // CRITICAL: Block scheduling for activities already finished
                    const isFinished = tower?.activityStatuses?.some(s => s.activityId === activityId && s.status === 'FINISHED');
                    if (isFinished) continue;

                    // Update Schedule
                    await orionApi.post("/production/schedule", {
                        towerId,
                        activityId,
                        plannedStart: startDate.toISOString(),
                        plannedEnd: endDate.toISOString(),
                        plannedQuantity: plannedQuantity ? parseFloat(plannedQuantity) : null
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 150)); // Throttling

                    // Update foreman if selected (using the first one for status metadata for now)
                    if (selectedForemanIds.length > 0) {
                        const foremanName = employees.find(e => e.id === selectedForemanIds[0])?.fullName;
                        await orionApi.post("/production/tower-status", {
                            towerId,
                            activityId,
                            foremanName,
                            metadata: {
                                leadName: foremanName,
                                additionalLeads: selectedForemanIds.slice(1).map(id => employees.find(e => e.id === id)?.fullName)
                            }
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, 150)); // Throttling
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
            toast.success(`${selectedTowerIds.length * selectedActivityIds.length} agendamentos criados com sucesso!`);
            onClose();
            // Reset wizard
            setStep("activities");
            setSelectedActivityIds([]);
            setSelectedTowerIds([]);
            setSelectedDays([]);
        },
        onError: (err: any) => {
            toast.error(err.message || "Erro ao salvar programação em lote.");
        }
    });

    const toggleDay = (day: Date) => {
        const exists = selectedDays.find(d => isSameDay(d, day));
        if (exists) {
            setSelectedDays(selectedDays.filter(d => !isSameDay(d, day)));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const selectAllWeek = () => {
        setSelectedDays(weekDays);
    };

    const getTowerStatusColor = (tower: TowerProductionData) => {
        const overallStatus = tower.overallStatus || 'PENDING';
        switch (overallStatus) {
            case 'FINISHED': return 'bg-emerald-500';
            case 'IN_PROGRESS': return 'bg-amber-500';
            default: return 'bg-slate-700';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-slate-950 border-amber-500/20 text-slate-100 p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="bg-amber-500/10 p-6 border-b border-amber-500/10 flex items-center justify-between shrink-0">
                    <div>
                        <DialogTitle className="flex items-center gap-3 text-lg font-black text-amber-500 uppercase tracking-widest">
                            <LayoutGrid className="w-5 h-5" />
                            Programação em Lote
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                            Agendamento massivo para a {format(defaultStartDate, "'Semana de' dd/MM", { locale: ptBR })}
                        </DialogDescription>
                    </div>
                    {/* Progress Steps Indicator */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={cn(
                                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                (s === 1 && step === "activities") || (s === 2 && step === "towers") || (s === 3 && step === "config") ? "bg-amber-500 w-8" :
                                    (s === 1 && (step === "towers" || step === "config")) || (s === 2 && step === "config") ? "bg-emerald-500/50" : "bg-white/10"
                            )} />
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Step Content */}
                    <div className="p-6 flex-1 overflow-hidden flex flex-col">
                        {step === "activities" && (
                            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between shrink-0">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Etapa 1: Selecionar Atividades</h4>
                                    <span className="text-[10px] font-bold text-amber-500">{selectedActivityIds.length} selecionadas</span>
                                </div>
                                <ScrollArea className="flex-1 pr-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {categories.map(cat => (
                                            <div key={cat.id} className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-white/5 pb-2 mb-2">{cat.name}</h5>
                                                {cat.activities.map(act => (
                                                    <div key={act.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => {
                                                        if (selectedActivityIds.includes(act.id)) {
                                                            setSelectedActivityIds(selectedActivityIds.filter(id => id !== act.id));
                                                        } else {
                                                            setSelectedActivityIds([...selectedActivityIds, act.id]);
                                                        }
                                                    }}>
                                                        <Checkbox
                                                            id={act.id}
                                                            checked={selectedActivityIds.includes(act.id)}
                                                            className="data-[state=checked]:bg-amber-500 border-white/10"
                                                        />
                                                        <label htmlFor={act.id} className="text-xs font-bold text-slate-200 group-hover:text-amber-500 transition-colors cursor-pointer uppercase">{act.name}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {step === "towers" && (
                            <div className="space-y-4 flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-3 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Etapa 2: Selecionar Estruturas</h4>
                                        <div className="flex items-center gap-3">
                                            <Button variant="link" className="text-[9px] font-bold text-slate-400 uppercase" onClick={() => setSelectedTowerIds(towers.map(t => t.id))}>Selecionar Tudo</Button>
                                            <span className="text-[10px] font-bold text-amber-500">{selectedTowerIds.length} selecionadas</span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            placeholder="Buscar por torre ou trecho..."
                                            className="pl-10 bg-slate-900 border-white/5 text-xs h-10 uppercase font-bold"
                                            value={towerSearch}
                                            onChange={e => setTowerSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 h-[400px] pr-4">
                                    <div className="grid grid-cols-3 gap-2 pb-4">
                                        {filteredTowers.map(tower => {
                                            const finishedCount = selectedActivityIds.filter(actId =>
                                                tower.activityStatuses?.find(s => s.activityId === actId && s.status === 'FINISHED')
                                            ).length;

                                            const isAllFinished = finishedCount === selectedActivityIds.length;
                                            const isSomeFinished = finishedCount > 0 && finishedCount < selectedActivityIds.length;

                                            return (
                                                <div
                                                    key={tower.id}
                                                    className={cn(
                                                        "p-3 rounded-lg border flex flex-col gap-1.5 transition-all cursor-pointer group relative overflow-hidden",
                                                        selectedTowerIds.includes(tower.id)
                                                            ? "bg-amber-500/10 border-amber-500/40 shadow-glow-sm"
                                                            : "bg-white/5 border-white/5 hover:border-white/20",
                                                        isAllFinished && "opacity-40 cursor-not-allowed grayscale bg-slate-900"
                                                    )}
                                                    onClick={() => {
                                                        if (isAllFinished) return;
                                                        if (selectedTowerIds.includes(tower.id)) {
                                                            setSelectedTowerIds(selectedTowerIds.filter(id => id !== tower.id));
                                                        } else {
                                                            setSelectedTowerIds([...selectedTowerIds, tower.id]);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-2 h-2 rounded-full", getTowerStatusColor(tower))} />
                                                            <span className="text-xs font-black uppercase tracking-tighter text-slate-100">{tower.objectId}</span>
                                                        </div>
                                                        {isAllFinished ? (
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                        ) : selectedTowerIds.includes(tower.id) && (
                                                            <CheckCircle2 className="w-3 h-3 text-amber-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase truncate">
                                                            ({tower.towerType || 'N/A'})
                                                        </span>
                                                        <span className={cn(
                                                            "text-[8px] font-bold uppercase tracking-widest mt-0.5 truncate border-t border-white/5 pt-1",
                                                            isAllFinished ? "text-emerald-500" : isSomeFinished ? "text-amber-500" : "text-slate-600"
                                                        )}>
                                                            {isAllFinished ? 'JÁ CONCLUÍDA' : isSomeFinished ? 'PARCIAL CONCLUÍDA' : (tower.trecho || 'Sem trecho')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {step === "config" && (
                            <div className="space-y-6 flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest shrink-0">Etapa 3: Configurar Programação</h4>

                                <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden">
                                    {/* Days Selection */}
                                    <div className="space-y-4 flex flex-col overflow-hidden">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-black uppercase text-amber-500/70 tracking-widest">Calendário de Execução</Label>
                                            <Button variant="link" className="text-[9px] font-bold text-slate-400 h-auto p-0 uppercase" onClick={selectAllWeek}>Semana Toda</Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {weekDays.map((day, i) => {
                                                const isSelected = selectedDays.some(d => isSameDay(d, day));
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => toggleDay(day)}
                                                        className={cn(
                                                            "p-3 rounded-lg border text-left flex flex-col gap-0.5 transition-all",
                                                            isSelected ? "bg-amber-500 border-amber-500 text-black shadow-lg" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                                                        )}
                                                    >
                                                        <span className="text-[8px] font-black uppercase">{format(day, 'EEEE', { locale: ptBR })}</span>
                                                        <span className="text-xs font-black">{format(day, 'dd/MM')}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Foremen Selection */}
                                    <div className="space-y-4 flex flex-col overflow-hidden">
                                        <Label className="text-[10px] font-black uppercase text-amber-500/70 tracking-widest leading-none">Encarregados (Multi-seleção)</Label>
                                        <ScrollArea className="flex-1 pr-4 bg-white/5 rounded-xl border border-white/5 p-2">
                                            <div className="space-y-1">
                                                {leaders.map(lead => (
                                                    <div
                                                        key={lead.id}
                                                        className={cn(
                                                            "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors group",
                                                            selectedForemanIds.includes(lead.id) ? "bg-amber-500/20 border border-amber-500/30" : "hover:bg-white/5"
                                                        )}
                                                        onClick={() => {
                                                            if (selectedForemanIds.includes(lead.id)) {
                                                                setSelectedForemanIds(selectedForemanIds.filter(id => id !== lead.id));
                                                            } else {
                                                                setSelectedForemanIds([...selectedForemanIds, lead.id]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                                            <User className="w-3 h-3 text-amber-500" />
                                                        </div>
                                                        <div className="flex flex-col flex-1 overflow-hidden">
                                                            <span className="text-[10px] font-black uppercase text-slate-200 truncate">{lead.fullName}</span>
                                                            <span className="text-[8px] font-bold text-slate-500 uppercase">{lead.functionName || 'Encarregado'}</span>
                                                        </div>
                                                        {selectedForemanIds.includes(lead.id) && <Check className="w-3 h-3 text-amber-500" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>

                                {/* Common Meta */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 shrink-0">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Qtd. Planejada (Padrão)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 1"
                                            className="h-10 bg-slate-900 border-white/5 text-xs font-black font-mono focus:border-amber-500/50"
                                            value={plannedQuantity}
                                            onChange={e => setPlannedQuantity(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-end justify-end">
                                        <div className="text-right p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                            <span className="block text-[8px] font-black text-slate-500 uppercase">Resumo da Execução</span>
                                            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-tighter">
                                                {selectedTowerIds.length} torres x {selectedActivityIds.length} atividades
                                            </span>
                                            <div className="text-[10px] font-bold text-slate-400">Total: {selectedTowerIds.length * selectedActivityIds.length} Programações</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="bg-slate-900/40 p-6 flex items-center justify-between border-t border-white/5 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-white font-bold h-10 px-6 uppercase text-[10px]"
                        onClick={() => {
                            if (step === "activities") onClose();
                            if (step === "towers") setStep("activities");
                            if (step === "config") setStep("towers");
                        }}
                    >
                        {step === "activities" ? "Cancelar" : (
                            <div className="flex items-center gap-2">
                                <ArrowLeft className="w-3 h-3" />
                                Voltar
                            </div>
                        )}
                    </Button>

                    <Button
                        size="sm"
                        disabled={
                            (step === "activities" && selectedActivityIds.length === 0) ||
                            (step === "towers" && selectedTowerIds.length === 0) ||
                            saveMutation.isPending
                        }
                        onClick={() => {
                            if (step === "activities") setStep("towers");
                            else if (step === "towers") setStep("config");
                            else saveMutation.mutate();
                        }}
                        className={cn(
                            "font-black px-10 h-10 text-[10px] uppercase tracking-widest transition-all",
                            step === "config" ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow" : "bg-amber-600 hover:bg-amber-500 text-black shadow-glow"
                        )}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : step === "config" ? (
                            <div className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5" />
                                Finalizar e Agendar
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                Próximo
                                <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
