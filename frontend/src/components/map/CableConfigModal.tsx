import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Zap, Settings2, ChevronRight, Navigation, Search } from 'lucide-react';
import { cn } from "@/lib/utils";

// Types
export interface PhaseConfig {
    id: string;
    name: string;
    enabled: boolean;
    color: [number, number, number]; // RGB
    hexColor?: string; // Cache hex for easier editing
    tension: number;
    verticalOffset: number;
    horizontalOffset: number;
    relativeHeight: number; // Percentage
    cableCount?: number; // 1, 2, 3, 4
    bundleSpacing?: number; // in meters
    width?: number; // Cable thickness
    spacerInterval?: number; // in meters
    spacerSize?: number; // scale multiplier for the frame
    spacerThickness?: number; // thickness of the spacer frame itself
    spacerColor?: [number, number, number]; // RGB
    cableType?: string; // Specification name (e.g., CAA Grosbeak)
    
    // Signal Spheres (Aviation Balls)
    signalSpheresEnabled?: boolean;
    signalSphereInterval?: number;
    signalSphereSize?: number;
    signalSphereColor?: [number, number, number];
}

interface CableConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    phases: PhaseConfig[];
    onUpdate: (phases: PhaseConfig[]) => void;
    onSave?: () => void;
    onRestoreDefaults: () => void;
    onScanTower?: () => void;
    readOnly?: boolean;
}

const PRESET_COLORS = [
    "#cbd5e1", // Alumínio Claro
    "#94a3b8", // Aço Polido
    "#e2e8f0", // Prata Brilhante
    "#475569", // Aço Escuro
    "#FFFFFF", // Branco/Reflexo
    "#00FFFF", "#0000FF", "#00FF00", "#FF0000"
];

const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [255, 255, 255];
};

const rgbToHex = (r: number, g: number, b: number): string =>
    "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();

export function CableConfigModal({ isOpen, onClose, phases, onUpdate, onSave, onRestoreDefaults, onScanTower, readOnly = false }: CableConfigModalProps) {
    const [localPhases, setLocalPhases] = useState<PhaseConfig[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalPhases([...phases]);
            // Only auto-select first phase if none is selected
            if (phases.length > 0 && !selectedId) {
                setSelectedId(phases[0].id);
            }
        }
    }, [isOpen, phases]); // Removed selectedId to prevent reset when switching tabs

    const handleSyncAndSave = () => {
        onUpdate(localPhases);
        if (onSave) onSave();
    };

    const handleApply = () => {
        handleSyncAndSave();
        onClose();
    };

    const updateLocalPhase = (id: string, updates: Partial<PhaseConfig>) => {
        setLocalPhases(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const selectedPhase = localPhases.find(p => p.id === selectedId);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                handleSyncAndSave();
                onClose();
            }
        }}>
            <DialogContent className="max-w-[900px] bg-[#0A0A0A] border-white/10 p-0 overflow-hidden shadow-2xl rounded-[32px] border ring-1 ring-white/5">
                <DialogHeader className="p-6 bg-linear-to-r from-cyan-950/30 to-transparent border-b border-white/5 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-1 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
                    <div className="flex items-center justify-between relative z-10 w-full">
                        <div>
                            <DialogTitle className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                                <Zap className="w-6 h-6 text-cyan-500 fill-cyan-500/20" />
                                Configuração de Cabos
                            </DialogTitle>
                            <p className="text-neutral-500 text-[9px] font-black uppercase tracking-[0.4em] mt-1 ml-9">Ajuste técnico de fases e feixes</p>
                        </div>
                        
                        {onScanTower && (
                            <Button
                                onClick={onScanTower}
                                size="sm"
                                className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold uppercase tracking-widest text-[10px]"
                            >
                                <Search className="w-3 h-3 mr-2" />
                                Escanear Torre 3D
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex h-[600px]">
                    {/* Left Column: Phase Matrix */}
                    <div className="w-[300px] border-r border-white/5 bg-black/40 p-5 space-y-2 overflow-y-auto no-scrollbar scroll-smooth">
                        <Label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] pl-1 mb-6 block">Matriz de Fases</Label>
                        <div className="space-y-4">
                            {localPhases.map((phase) => (
                                <button
                                    key={phase.id}
                                    onClick={() => {
                                        if (selectedId !== phase.id) {
                                            handleSyncAndSave();
                                            setSelectedId(phase.id);
                                        }
                                    }}
                                    className={cn(
                                        "w-full p-4 rounded-3xl flex items-center gap-4 transition-all duration-300 group relative overflow-hidden border",
                                        selectedId === phase.id
                                            ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.5)] scale-[1.02]"
                                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-neutral-400 hover:text-white"
                                    )}
                                >
                                    {selectedId === phase.id && (
                                        <div className="absolute inset-0 bg-linear-to-r from-white/20 to-transparent opacity-50 animate-pulse" />
                                    )}
                                    
                                    <div
                                        className={cn(
                                            "w-8 h-8 rounded-2xl border-2 shadow-lg transition-all duration-500 relative z-10 flex items-center justify-center",
                                            selectedId === phase.id ? "border-black/30 scale-110" : "border-white/10"
                                        )}
                                        style={{ backgroundColor: `rgb(${phase.color.join(',')})` }}
                                    >
                                        {selectedId === phase.id && <div className="w-2 h-2 rounded-full bg-black/50 backdrop-blur-sm" />}
                                    </div>

                                    <div className="text-left flex-1 relative z-10 overflow-hidden">
                                        <div className="text-[14px] font-black uppercase tracking-tight leading-none mb-1 truncate w-full">{phase.name}</div>
                                        <div className={cn(
                                            "text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2",
                                            selectedId === phase.id ? "text-black" : "text-neutral-500"
                                        )}>
                                            <span>{phase.cableCount || 1} COND</span>
                                            <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                                            <span>{phase.verticalOffset}M</span>
                                        </div>
                                    </div>

                                    {selectedId !== phase.id && (
                                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors group-hover:translate-x-1 duration-300" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Settings */}
                    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin bg-linear-to-b from-[#0A0A0A] to-[#111111]">
                        {selectedPhase ? (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
                                
                                {/* Technical Info Section */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Informações Técnicas</h3>
                                    </div>

                                    <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 space-y-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
                                        
                                        <div className="space-y-3 relative z-10">
                                            <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Modelo/Tipo de Cabo (Spec)</Label>
                                            <Input
                                                value={selectedPhase.cableType || ''}
                                                onChange={(e) => updateLocalPhase(selectedId!, { cableType: e.target.value })}
                                                placeholder="EX: CAA 636 KCMIL GROSBEAK"
                                                className="h-14 bg-black/50 border-white/10 rounded-2xl pl-6 font-black text-base tracking-tight focus:ring-2 focus:ring-cyan-500/50 uppercase italic placeholder:text-neutral-700 focus:border-cyan-500/50 transition-all shadow-inner"
                                            />
                                        </div>

                                        <div className="space-y-4 relative z-10">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Paleta de Identificação</Label>
                                                <div className="max-w-[140px] relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: rgbToHex(...selectedPhase.color) }} />
                                                    <Input
                                                        value={rgbToHex(...selectedPhase.color).replace('#', '')}
                                                        onChange={(e) => {
                                                            const hex = '#' + e.target.value.replace('#', '');
                                                            if (/^#?[0-9A-F]{6}$/i.test(hex)) {
                                                                updateLocalPhase(selectedId!, { color: hexToRgb(hex) });
                                                            }
                                                        }}
                                                        className="h-9 bg-black/50 border-white/10 rounded-xl pl-9 font-mono text-[10px] tracking-[0.2em] focus:ring-cyan-500/50 uppercase font-bold text-center"
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-4 p-4 bg-black/30 rounded-3xl border border-white/5">
                                                {PRESET_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => updateLocalPhase(selectedPhase.id, { color: hexToRgb(color) })}
                                                        className={cn(
                                                            "w-12 h-12 rounded-full border-4 border-neutral-900 transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center relative group",
                                                            rgbToHex(...selectedPhase.color).toLowerCase() === color.toLowerCase()
                                                                ? "ring-2 ring-cyan-500 ring-offset-4 ring-offset-neutral-950 scale-110"
                                                                : "opacity-70 hover:opacity-100 hover:ring-2 hover:ring-white/20 hover:ring-offset-2 hover:ring-offset-neutral-950"
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {rgbToHex(...selectedPhase.color).toLowerCase() === color.toLowerCase() && (
                                                            <Check className="w-5 h-5 text-black drop-shadow-md" strokeWidth={3} />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Positioning Section */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                                            <Navigation className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Posicionamento na Torre</h3>
                                    </div>

                                    <div className="bg-white/5 rounded-4xl p-8 border border-white/10 group shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-orange-500/20 to-transparent" />
                                        <div className="grid grid-cols-2 gap-12 relative z-10">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-4">Offset Vertical (m)</Label>
                                                <div className="relative group/input">
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        value={selectedPhase.verticalOffset || 0}
                                                        onChange={(e) => updateLocalPhase(selectedId!, { verticalOffset: parseFloat(e.target.value) || 0 })}
                                                        className="h-16 bg-black/50 border-white/10 rounded-3xl text-3xl font-black tracking-tighter focus:ring-orange-500/50 pl-8 text-white transition-all focus:scale-[1.02] focus:border-orange-500/50"
                                                    />
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-500/40 uppercase tracking-widest pointer-events-none">Altura</div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-4">Offset Horizontal (m)</Label>
                                                <div className="relative group/input">
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        value={selectedPhase.horizontalOffset || 0}
                                                        onChange={(e) => updateLocalPhase(selectedId!, { horizontalOffset: parseFloat(e.target.value) || 0 })}
                                                        className="h-16 bg-black/50 border-white/10 rounded-3xl text-3xl font-black tracking-tighter focus:ring-orange-500/50 pl-8 text-white transition-all focus:scale-[1.02] focus:border-orange-500/50"
                                                    />
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-500/40 uppercase tracking-widest pointer-events-none">Afastamento</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Bundle & Spacers Configuration */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                                            <Settings2 className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Feixe & Espessura</h3>
                                    </div>

                                    <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
                                        <div className="grid grid-cols-2 gap-12 relative z-10">
                                            <div className="space-y-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Cabos por Fase</Label>
                                                    <div className="flex bg-black/50 p-2 rounded-2xl border border-white/5 shadow-inner">
                                                        {[1, 2, 3, 4].map((num) => (
                                                            <button
                                                                key={num}
                                                                onClick={() => !readOnly && updateLocalPhase(selectedPhase.id, { cableCount: num })}
                                                                disabled={readOnly}
                                                                className={cn(
                                                                    "flex-1 py-4 px-2 rounded-xl font-black text-sm transition-all duration-300 relative overflow-hidden",
                                                                    selectedPhase.cableCount === num
                                                                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                                                        : "text-neutral-500 hover:text-white hover:bg-white/5",
                                                                    readOnly && "opacity-50 cursor-not-allowed"
                                                                )}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                                        Tensionamento (Tension)
                                                    </Label>
                                                    <div className="relative group/input">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0.1"
                                                            max="5.0"
                                                            value={selectedPhase.tension || 1.0}
                                                            onChange={(e) => updateLocalPhase(selectedId!, { tension: parseFloat(e.target.value) || 1.0 })}
                                                            className="h-14 bg-cyan-950/20 border-cyan-500/30 rounded-2xl text-2xl font-black tracking-tighter focus:ring-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.1)] pl-6 text-cyan-400"
                                                        />
                                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-cyan-700 uppercase tracking-widest pointer-events-none">Fator K</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Espaçamento Feixe (m)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.05"
                                                        value={selectedPhase.bundleSpacing || 0.4}
                                                        onChange={(e) => updateLocalPhase(selectedId!, { bundleSpacing: parseFloat(e.target.value) || 0.4 })}
                                                        className="h-16 bg-black/50 border-white/10 rounded-3xl text-3xl font-black tracking-tighter focus:ring-cyan-500/50 pl-6 text-white transition-all focus:scale-[1.02] focus:border-cyan-500/50"
                                                    />
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Espessura (m)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={selectedPhase.width || 0.15}
                                                        onChange={(e) => updateLocalPhase(selectedId!, { width: parseFloat(e.target.value) || 0.15 })}
                                                        className="h-14 bg-black/50 border-white/10 rounded-2xl text-xl font-black tracking-tighter focus:ring-cyan-500/50 pl-6 text-neutral-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Spacers Advanced Settings */}
                                <section>
                                     <div className="flex items-center gap-3 mb-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400 border border-white/10">
                                            <Settings2 className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Ajustes Avançados de Espaçadores</h3>
                                    </div>
                                    
                                    <div className="bg-white/2 rounded-4xl p-8 border border-white/5 hover:bg-white/5 transition-colors duration-500">
                                        <div className="grid grid-cols-2 gap-8 mb-8">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Intervalo (m)</Label>
                                                <Input
                                                    type="number"
                                                    step="5"
                                                    value={selectedPhase.spacerInterval || 0}
                                                    onChange={(e) => updateLocalPhase(selectedId!, { spacerInterval: parseFloat(e.target.value) || 0 })}
                                                    className="h-12 bg-black/30 border-white/5 rounded-2xl text-lg font-black tracking-tighter focus:ring-cyan-500/30 pl-4"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Escala Frame</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={selectedPhase.spacerSize || 1.1}
                                                    onChange={(e) => updateLocalPhase(selectedId!, { spacerSize: parseFloat(e.target.value) || 1.1 })}
                                                    className="h-12 bg-black/30 border-white/5 rounded-2xl text-lg font-black tracking-tighter focus:ring-cyan-500/30 pl-4"
                                                />
                                            </div>
                                        </div>

                                         <div className="space-y-4 pt-6 border-t border-white/5">
                                            <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Cor do Material</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {["#141414", "#404040", "#808080", "#C0C0C0", "#E53E3E", "#D69E2E"].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => updateLocalPhase(selectedPhase.id, { spacerColor: hexToRgb(color) })}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border border-white/20 transition-all hover:scale-110",
                                                            rgbToHex(...(selectedPhase.spacerColor || [20, 20, 20])).toLowerCase() === color.toLowerCase()
                                                                ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-neutral-900 scale-110"
                                                                : "opacity-40 hover:opacity-100"
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Signal Spheres (Aviation Balls) Configuration */}
                                <section>
                                     <div className="flex items-center gap-3 mb-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Sinalização Aérea (Esferas)</h3>
                                    </div>
                                    
                                    <div className="bg-white/2 rounded-4xl p-8 border border-white/5 hover:bg-white/5 transition-colors duration-500">
                                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                            <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Ativar Sinalização</Label>
                                            <button 
                                                onClick={() => updateLocalPhase(selectedPhase.id, { signalSpheresEnabled: !selectedPhase.signalSpheresEnabled })}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-all relative border border-white/10",
                                                    selectedPhase.signalSpheresEnabled ? "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-white/5"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 rounded-full transition-all shadow-md",
                                                    selectedPhase.signalSpheresEnabled ? "right-1 bg-white" : "left-1 bg-neutral-600"
                                                )} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 mb-8">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Intervalo (m)</Label>
                                                <Input
                                                    type="number"
                                                    step="5"
                                                    value={selectedPhase.signalSphereInterval || 40}
                                                    onChange={(e) => updateLocalPhase(selectedId!, { signalSphereInterval: parseFloat(e.target.value) || 0 })}
                                                    className="h-12 bg-black/30 border-white/5 rounded-2xl text-lg font-black tracking-tighter focus:ring-orange-500/30 pl-4"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Diâmetro (m)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={selectedPhase.signalSphereSize || 0.6}
                                                    onChange={(e) => updateLocalPhase(selectedId!, { signalSphereSize: parseFloat(e.target.value) || 0.6 })}
                                                    className="h-12 bg-black/30 border-white/5 rounded-2xl text-lg font-black tracking-tighter focus:ring-orange-500/30 pl-4"
                                                />
                                            </div>
                                        </div>

                                         <div className="space-y-4 pt-6 border-t border-white/5">
                                            <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Cor das Esferas</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {["#FF5000", "#FF8C00", "#FF0000", "#FFFFFF", "#FFFF00"].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => updateLocalPhase(selectedPhase.id, { signalSphereColor: hexToRgb(color) })}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border border-white/20 transition-all hover:scale-110",
                                                            rgbToHex(...(selectedPhase.signalSphereColor || [255, 80, 0])).toLowerCase() === color.toLowerCase()
                                                                ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-neutral-900 scale-110"
                                                                : "opacity-40 hover:opacity-100"
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-neutral-800 space-y-6 animate-in zoom-in-50 duration-500">
                                <div className="w-24 h-24 rounded-full bg-white/2 flex items-center justify-center border border-white/5">
                                    <Zap className="w-10 h-10 opacity-20" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-black uppercase tracking-widest text-neutral-500">Nenhuma Fase Selecionada</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-700">Selecione uma fase ao lado para editar</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-[#050505] border-t border-white/5 flex items-center justify-between backdrop-blur-3xl z-50 relative">
                    <Button
                        variant="ghost"
                        onClick={onRestoreDefaults}
                        disabled={readOnly}
                        className={cn(
                            "text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-red-400 hover:bg-red-500/10 px-6 h-12 rounded-xl border border-transparent hover:border-red-500/20 transition-all",
                            readOnly && "opacity-20 cursor-not-allowed"
                        )}
                    >
                        Restaurar Padrão
                    </Button>
                    <div className="flex gap-4">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 px-8 h-12 rounded-xl text-neutral-400 hover:text-white transition-all border border-white/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={readOnly}
                            className={cn(
                                "bg-cyan-500 text-black hover:bg-cyan-400 text-[10px] font-black uppercase tracking-widest px-10 h-12 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.3)] gap-3 hover:scale-105 active:scale-95 transition-all border border-cyan-400",
                                readOnly && "opacity-20 grayscale"
                            )}
                        >
                            <Check className="w-4 h-4" strokeWidth={3} />
                            Aplicar Configurações
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
