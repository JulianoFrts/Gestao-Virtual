import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ActivityStatus, LandStatus, ImpedimentType } from "../../types";
import { cn } from "@/lib/utils";

interface StatusTabProps {
    status: ActivityStatus;
    setStatus: (val: ActivityStatus) => void;
    landStatus: LandStatus;
    setLandStatus: (val: LandStatus) => void;
    selectedReasonId: string;
    setSelectedReasonId: (val: string) => void;
    setImpedimentType: (val: ImpedimentType) => void;
    delayReasons: any[];
    progressPercent: number;
    setProgressPercent: (val: number) => void;
    isFoundation: boolean;
    componentLabels: string[];
    components: Record<string, ActivityStatus>;
    toggleComponentStatus: (label: string) => void;
}

export const StatusTab = ({
    status, setStatus,
    landStatus, setLandStatus,
    selectedReasonId, setSelectedReasonId,
    setImpedimentType,
    delayReasons,
    progressPercent, setProgressPercent,
    isFoundation,
    componentLabels,
    components,
    toggleComponentStatus
}: StatusTabProps) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Status Manager Grid */}
            <div className="grid gap-6">
                <div className="grid gap-3">
                    <Label htmlFor="status" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-1">
                        <div className="w-1 h-3 bg-amber-500 rounded-full" /> Status Atividade
                    </Label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                        {[
                            { id: 'PENDING', label: 'Pendente', color: 'bg-[#5D4037]/40 text-orange-200 border-[#5D4037]' },
                            { id: 'IN_PROGRESS', label: 'Execução', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
                            { id: 'FINISHED', label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setStatus(s.id as ActivityStatus)}
                                className={cn(
                                    "flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-300 group relative overflow-hidden",
                                    status === s.id 
                                        ? s.color + " shadow-lg shadow-black/40 scale-100" 
                                        : "bg-transparent border-transparent text-slate-500 hover:bg-white/5 opacity-60 hover:opacity-100 scale-95"
                                )}
                            >
                                {status === s.id && (
                                    <div className="absolute top-0 right-0 p-1">
                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                                    </div>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-widest italic">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={cn(
                    "grid gap-4 transition-all duration-500",
                    landStatus === 'EMBARGO' ? "grid-cols-1" : "grid-cols-2"
                )}>
                    <div className="grid gap-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1 opacity-70">Status Fundiário</Label>
                        <Select value={landStatus} onValueChange={(val: LandStatus) => setLandStatus(val)}>
                            <SelectTrigger className={cn(
                                "h-11 border-white/5 bg-white/3 text-xs font-black rounded-xl transition-all",
                                landStatus === 'EMBARGO' && "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]",
                                landStatus === 'IMPEDIMENT' && "bg-orange-500/20 text-orange-400 border-orange-500/30",
                                landStatus === 'FREE' && "bg-white/3 text-emerald-500"
                            )}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-slate-100 rounded-2xl">
                                <SelectItem value="FREE" className="font-bold">✓ Liberado</SelectItem>
                                <SelectItem value="IMPEDIMENT" className="font-bold text-orange-400">⚠ Impedimento</SelectItem>
                                <SelectItem value="EMBARGO" className="font-bold text-red-400">✖ Embargo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {landStatus !== 'EMBARGO' && (
                        <div className="grid gap-3 animate-in slide-in-from-right-2 duration-300">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1 opacity-70">Motivo / Detalhe</Label>
                            <Select
                                value={selectedReasonId}
                                onValueChange={(val) => {
                                    setSelectedReasonId(val);
                                    const reason = delayReasons.find((r: any) => r.id === val);
                                    if (reason) setImpedimentType(reason.category);
                                }}
                            >
                                <SelectTrigger className="h-11 bg-white/3 border-white/5 text-xs font-bold rounded-xl italic">
                                    <SelectValue placeholder="Opcional..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-slate-100 rounded-2xl max-h-[300px]">
                                    {delayReasons.map((r: any) => (
                                        <SelectItem key={r.id} value={r.id} className="text-[10px] font-black p-3 hover:bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-mono text-[9px] shrink-0">
                                                    {r.code}
                                                </Badge>
                                                <span className="uppercase tracking-tight leading-tight">{r.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Physical Progress Slider - Ultra Premium */}
            <div className="grid gap-4 bg-linear-to-r from-amber-500/10 to-transparent p-5 rounded-2xl border border-amber-500/10 ring-1 ring-white/5">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">
                            Avanço Físico
                        </Label>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest italic opacity-50">Arraste para atualizar o percentual</p>
                    </div>
                    <div className="text-3xl font-black italic tracking-tighter text-amber-500 drop-shadow-glow">
                        {progressPercent}<span className="text-xs ml-1 opacity-50">%</span>
                    </div>
                </div>
                <div className="relative pt-2 pb-1">
                    <input
                        type="range" min="0" max="100" step="1"
                        value={progressPercent}
                        onChange={(e) => setProgressPercent(parseInt(e.target.value))}
                        className="w-full h-2 bg-black/60 rounded-full appearance-none cursor-pointer accent-amber-500 transition-all hover:bg-black/80"
                        disabled={status === 'FINISHED'}
                    />
                    <div 
                        className="absolute h-2 bg-amber-500 rounded-full pointer-events-none transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                        style={{ width: `${progressPercent}%`, top: '12px' }}
                    />
                </div>
                <div className="flex justify-between px-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase">0%</span>
                    <span className="text-[8px] font-black text-slate-600 uppercase">100%</span>
                </div>
            </div>

            {isFoundation && (
                <div className="grid gap-4 bg-white/2 p-5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <span className="text-emerald-500 text-[10px] font-black">4x</span>
                        </div>
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">Componentes da Estrutura</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                        {componentLabels.map(label => {
                            const cStatus = components[label];
                            return (
                                <div
                                    key={label}
                                    className={cn(
                                        "group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-500 border relative overflow-hidden",
                                        cStatus === 'FINISHED' && "bg-emerald-500/10 border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.1)]",
                                        cStatus === 'IN_PROGRESS' && "bg-amber-500/5 border-amber-500/20",
                                        cStatus === 'PENDING' && "bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/5",
                                    )}
                                    onClick={() => toggleComponentStatus(label)}
                                >
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest italic group-hover:scale-105 transition-transform origin-left",
                                            cStatus === 'FINISHED' && "text-emerald-400",
                                            cStatus === 'IN_PROGRESS' && "text-amber-200",
                                            cStatus === 'PENDING' && "text-slate-600 group-hover:text-slate-400"
                                        )}>{label}</span>
                                        <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.3em] group-hover:text-white/20 transition-colors">ESTRUTURA</span>
                                    </div>
                                    <Badge
                                        className={cn(
                                            "text-[8px] font-black tracking-widest border-none px-2 h-5 rounded-lg shadow-sm group-hover:rotate-12 transition-transform",
                                            cStatus === 'FINISHED' && "bg-emerald-500 text-black",
                                            cStatus === 'IN_PROGRESS' && "bg-amber-500 text-black",
                                            cStatus === 'PENDING' && "bg-white/5 text-slate-700"
                                        )}
                                    >
                                        {cStatus === 'FINISHED' ? 'OK' : cStatus === 'IN_PROGRESS' ? 'EXE' : 'PEN'}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[8px] text-center text-slate-600 font-black uppercase tracking-widest opacity-50 mt-2">O avanço físico é calculado proporcionalmente aos componentes</p>
                </div>
            )}
        </div>
    );
};
