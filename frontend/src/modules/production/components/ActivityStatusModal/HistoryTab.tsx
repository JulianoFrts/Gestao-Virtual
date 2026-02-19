import React from "react";
import { format } from "date-fns";
import { Loader2, AlertTriangle, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { show } from "@/signals/authSignals";

import { HistoryLog } from "@/modules/production/types";

interface HistoryTabProps {
    isLoadingHistory: boolean;
    history: HistoryLog[];
    approveMutation: any; // Mantido any temporariamente até tipar o mutation
}

export const HistoryTab = ({ isLoadingHistory, history, approveMutation }: HistoryTabProps) => {
    if (isLoadingHistory) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 animate-in fade-in duration-500">
                <div className="relative">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                </div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Sincronizando Histórico...</span>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-700 animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 rounded-full bg-white/2 border border-white/5 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 opacity-30" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nenhum registro encontrado</p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Inicie a execução para gerar logs</p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-8 py-6 max-h-[65vh] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-linear-to-b before:from-amber-500/50 before:via-white/5 before:to-white/5">
                {history.map((log: any, idx: number) => (
                    <div key={idx} className="relative pl-10 group">
                        {/* Indicador da Timeline */}
                        <div className={cn(
                            "absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 transition-all duration-500",
                            log.status === 'APPROVED' ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-amber-600"
                        )}>
                            {log.status === 'APPROVED' ? (
                                <Check className="w-2.5 h-2.5 text-black" />
                            ) : (
                                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                            )}
                        </div>

                        <div className="bg-white/2 rounded-2xl p-5 border border-white/5 group-hover:bg-white/5 group-hover:border-white/10 transition-all duration-500 relative overflow-hidden">
                            {/* Reflexo Superior */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-amber-500/60 font-mono tracking-tighter uppercase">
                                            {format(new Date(log.timestamp), "dd/MM/yyyy • HH:mm")}
                                        </span>
                                        <Badge className={cn(
                                            "text-[9px] font-black h-4 px-2 uppercase tracking-widest border-none rounded-full",
                                            log.status === 'FINISHED' && "bg-emerald-500 text-black",
                                            log.status === 'IN_PROGRESS' && "bg-amber-500 text-black",
                                            log.status === 'PENDING' && "bg-slate-800 text-slate-400",
                                            log.status === 'APPROVED' && "bg-sky-500 text-black"
                                        )}>
                                            {log.status === 'IN_PROGRESS' ? 'EXECUÇÃO' : log.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-end gap-1">
                                        <span className="text-2xl font-black italic tracking-tighter text-white">
                                            {log.progress}
                                        </span>
                                        <span className="text-[10px] font-black text-white/30 mb-2">% AVANÇO</span>
                                    </div>
                                </div>

                                {log.status !== 'APPROVED' && show('production.canApproveLogs') && (
                                    <Button
                                        size="sm" variant="outline"
                                        className="h-10 px-4 text-[9px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500 hover:text-black rounded-xl transition-all shadow-lg active:scale-95"
                                        onClick={() => approveMutation.mutate({
                                            progressId: log.progressId,
                                            logTimestamp: log.timestamp
                                        })}
                                        disabled={approveMutation.isPending}
                                    >
                                        {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-2" />}
                                        APROVAR REGISTRO
                                    </Button>
                                )}

                                {log.status === 'APPROVED' && (
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                            <Check className="w-3.5 h-3.5" />
                                            VALIDADO
                                        </div>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider italic">
                                            {log.approvedBy || 'SISTEMA'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {log.notes && (
                                <div className="relative group/note p-4 bg-black/40 rounded-xl border-l-2 border-amber-500/40">
                                    <p className="text-[11px] text-slate-300 font-bold leading-relaxed italic">
                                        "{log.notes}"
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                        <User className="w-3 h-3 text-slate-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.metadata?.leadName || 'SISTEMA'}</span>
                                        <span className="text-[7px] font-bold text-slate-600 uppercase tracking-[0.2em]">RESPONSÁVEL CAMPO</span>
                                    </div>
                                </div>
                                <div className="text-[7px] font-black text-white/5 uppercase tracking-[0.4em]">ORION CORE LAYER</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
