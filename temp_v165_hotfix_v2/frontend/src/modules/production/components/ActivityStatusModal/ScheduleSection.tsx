import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ScheduleSectionProps {
    plannedStart: Date | undefined;
    setPlannedStart: (d: Date | undefined) => void;
    plannedEnd: Date | undefined;
    setPlannedEnd: (d: Date | undefined) => void;
    plannedQuantity: string;
    setPlannedQuantity: (s: string) => void;
    plannedHours: string;
    setPlannedHours: (s: string) => void;
}

export const ScheduleSection = ({
    plannedStart, setPlannedStart,
    plannedEnd, setPlannedEnd,
    plannedQuantity, setPlannedQuantity,
    plannedHours, setPlannedHours
}: ScheduleSectionProps) => {
    return (
        <div className="border border-indigo-500/20 bg-indigo-950/20 p-3 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
                <CalendarIcon className="h-3 w-3 text-indigo-400" />
                <Label className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Dados de Planejamento</Label>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="grid gap-1">
                    <Label className="text-[9px] font-medium text-slate-400 uppercase">Início</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 bg-slate-900 border-indigo-500/30 text-[10px] hover:bg-indigo-950/40 font-bold">
                                {plannedStart ? format(plannedStart, "dd/MM/yyyy") : "Definir"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800">
                            <Calendar mode="single" selected={plannedStart} onSelect={setPlannedStart} className="bg-slate-900 text-slate-100" />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-1">
                    <Label className="text-[9px] font-medium text-slate-400 uppercase">Fim</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 bg-slate-900 border-indigo-500/30 text-[10px] hover:bg-indigo-950/40 font-bold">
                                {plannedEnd ? format(plannedEnd, "dd/MM/yyyy") : "Definir"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800">
                            <Calendar mode="single" selected={plannedEnd} onSelect={setPlannedEnd} className="bg-slate-900 text-slate-100" />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-1">
                    <Label className="text-[9px] font-medium text-slate-400 uppercase">Qtd Plan</Label>
                    <input
                        type="number" placeholder="0.00"
                        className="h-8 bg-slate-900 border border-indigo-500/30 rounded-md px-2 text-[10px] text-white focus:outline-hidden focus:border-indigo-500 font-bold"
                        value={plannedQuantity}
                        onChange={e => setPlannedQuantity(e.target.value)}
                    />
                </div>
                <div className="grid gap-1">
                    <Label className="text-[9px] font-medium text-slate-400 uppercase">HHH Prev</Label>
                    <input
                        type="number" placeholder="0.00"
                        className="h-8 bg-slate-900 border border-indigo-500/30 rounded-md px-2 text-[10px] text-white focus:outline-hidden focus:border-indigo-500 font-bold"
                        value={plannedHours}
                        onChange={e => setPlannedHours(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};
