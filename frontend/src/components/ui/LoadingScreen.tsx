import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useState } from "react";
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "./button";
import { Switch } from "./switch";
import { Label } from "./label";


interface LoadingDetail {
    label: string;
    isLoading: boolean;
}

interface LoadingScreenProps {
    isLoading: boolean;
    title?: string;
    message?: string;
    details?: LoadingDetail[];
}

export const LoadingScreen = ({ 
    isLoading, 
    title = "GESTÃO VIRTUAL", 
    message = "SINCRONIZAÇÃO DE DADOS",
    details = []
}: LoadingScreenProps) => {
    useSignals();
    const [isExpanded, setIsExpanded] = useState(true);


    const totalItems = details.length;
    const loadedItems = details.filter(d => !d.isLoading).length;
    const progress = totalItems > 0 ? Math.round((loadedItems / totalItems) * 100) : 0;

    const showDetails = details.length > 0; // Removido isSystemAdminSignal.value para que todos vejam o progresso se houver detalhes

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#050505] overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="relative flex flex-col items-center gap-12 max-w-md w-full px-6 z-10">
                {/* Spinner Section */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]" viewBox="0 0 100 100">
                        <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            stroke="rgba(255,255,255,0.03)"
                            strokeWidth="2"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeDasharray="276.46"
                            strokeDashoffset={totalItems > 0 ? (276.46 - (276.46 * progress) / 100) : 70}
                            strokeLinecap="round"
                            className={cn("transition-all duration-300 ease-out text-primary", totalItems === 0 && "animate-spin-slow")}
                            style={{ strokeDashoffset: totalItems > 0 ? undefined : 200 }}
                        />
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            {totalItems > 0 ? progress : <Loader2 className="w-8 h-8 animate-spin text-primary/50" />}
                            {totalItems > 0 && <span className="text-sm text-primary/70 ml-0.5">%</span>}
                        </span>
                    </div>
                </div>

                {/* Text Section */}
                <div className="text-center space-y-3">
                    <h2 className="text-2xl font-black tracking-[0.3em] uppercase text-white italic drop-shadow-strong">
                        {title}
                    </h2>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px w-6 bg-linear-to-r from-transparent to-primary/50" />
                        <p className="text-primary/70 text-[9px] font-black uppercase tracking-[0.4em]">
                            {message}
                        </p>
                        <div className="h-px w-6 bg-linear-to-l from-transparent to-primary/50" />
                    </div>
                </div>

                {/* Status List */}
                {showDetails && (
                    <div className="w-full glass-card bg-white/2 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                                    SINCRONIZAÇÃO DE DADOS
                                </span>
                                <span className="text-[7px] font-bold text-amber-500/50 flex items-center gap-1 uppercase tracking-widest mt-0.5">
                                    <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                                    Active Sync
                                </span>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="h-6 text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 gap-2 px-2"
                            >
                                {isExpanded ? 'OCULTAR DETALHES' : 'EXIBIR DETALHES'}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                        </div>

                        <div className={cn(
                            "space-y-2.5 transition-all duration-500 ease-in-out overflow-hidden",
                            isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                        )}>

                            {details.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/2">
                                    <span className={cn(
                                        "font-bold tracking-wide transition-colors duration-500",
                                        item.isLoading ? "text-white/40" : "text-white/90"
                                    )}>
                                        {item.label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {item.isLoading ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/40" />
                                        ) : (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shadow-glow-sm" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
