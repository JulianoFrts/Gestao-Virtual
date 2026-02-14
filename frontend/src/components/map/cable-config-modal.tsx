import React, { useState, useEffect } from 'react';
import { X, Cable, Settings2, Palette, Move, Gauge, Plus, Trash2, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface CableAnchorConfig {
    id: string;
    label: string;
    phase?: string; // Phase A, B, C, Para-raio, etc.
    circuitId?: string; // Optional: To filter by tower circuit (e.g. C1, C2)
    h: number;      // Horizontal offset in meters (negative = left, positive = right)
    vRatio: number; // Vertical position as ratio of tower height (0-1)
    vOffset?: number; // Additional vertical offset in meters
    color: string;
    width: number;  // Line width in pixels
    enabled: boolean;
    manualAnchorName?: string; // Explicit anchor name from Lab 3D
}

export interface ModelTransform {
    displayName?: string;
    scale: [number, number, number];    // x, y, z
    rotation: [number, number, number]; // x, y, z
    offset: [number, number, number];   // x, y, z
    baseHeight: number;                 // Base height multiplier
    anchorGlobalOffset?: { x: number, y: number, z: number }; // Manual offset for anchors in meters
    anchorOverrides?: Record<string, { x: number, y: number, z: number }>; // Per-anchor individual offsets in meters
    phaseOverrides?: Record<string, { x: number, y: number, z: number }>; // Per-phase group offsets in meters (e.g. FASE A)
    alignmentMode?: 'bisector' | 'tangential' | 'manual';
    alignmentManualAngle?: number; // Degrees
}

export interface CableSettings {
    tension: number;           // Catenary constant (higher = less sag)
    globalOpacity: number;     // 0-1
    towerVerticalOffset: number; // Meters to raise towers and cables above terrain
    anchors: CableAnchorConfig[];
    customModelUrl?: string; // Optional URL for custom GLB/GLTF model
    customTexture?: string;  // Optional global default texture
    modelConfigs?: Record<string, ModelTransform>; // Configs per model URL (or 'default')
    alignmentMethod: 'bisector' | 'tangential';
}

// Default 14-cable configuration (3 phases x 4 cables + 2 shield wires)
// Updated with user screenshot values: 3 phases horizontal arrangement (Pórtico)
export const DEFAULT_CABLE_SETTINGS: CableSettings = {
    tension: 1200,
    globalOpacity: 0.9,
    towerVerticalOffset: 30, // Reset to near-ground to avoid flying towers
    alignmentMethod: 'bisector',
    anchors: [
        // ============== PARA-RAIOS (TOPO) ==============
        { id: 'GW-OPGW', label: 'Cabo OPGW', phase: 'PARA-RAIO', h: -3.0, vRatio: 1.0, vOffset: 0, color: '#e5e7eb', width: 1, enabled: true },
        { id: 'GW-3/8', label: 'Cabo 3/8', phase: 'PARA-RAIO', h: 3.0, vRatio: 1.0, vOffset: 0, color: '#e5e7eb', width: 1, enabled: true },

        // ============== FASE A (ESQUERDA) ==============
        { id: 'FA-1', label: 'Fase A1', phase: 'FASE A', h: -9.0, vRatio: 0.85, vOffset: 0.15, color: '#94a3b8', width: 1.5, enabled: true },
        { id: 'FA-2', label: 'Fase A2', phase: 'FASE A', h: -9.0, vRatio: 0.85, vOffset: -0.15, color: '#94a3b8', width: 1.5, enabled: true },
        { id: 'FA-3', label: 'Fase A3', phase: 'FASE A', h: -8.0, vRatio: 0.85, vOffset: 0.15, color: '#94a3b8', width: 1.5, enabled: true },
        { id: 'FA-4', label: 'Fase A4', phase: 'FASE A', h: -8.0, vRatio: 0.85, vOffset: -0.15, color: '#94a3b8', width: 1.5, enabled: true },

        // ============== FASE B (CENTRO) ==============
        { id: 'FB-1', label: 'Fase B1', phase: 'FASE B', h: -0.5, vRatio: 0.85, vOffset: 0.15, color: '#cbd5e1', width: 1.5, enabled: true },
        { id: 'FB-2', label: 'Fase B2', phase: 'FASE B', h: -0.5, vRatio: 0.85, vOffset: -0.15, color: '#cbd5e1', width: 1.5, enabled: true },
        { id: 'FB-3', label: 'Fase B3', phase: 'FASE B', h: 0.5, vRatio: 0.85, vOffset: 0.15, color: '#cbd5e1', width: 1.5, enabled: true },
        { id: 'FB-4', label: 'Fase B4', phase: 'FASE B', h: 0.5, vRatio: 0.85, vOffset: -0.15, color: '#cbd5e1', width: 1.5, enabled: true },

        // ============== FASE C (DIREITA) ==============
        { id: 'FC-1', label: 'Fase C1', phase: 'FASE C', h: 8.3, vRatio: 0.85, vOffset: 0.15, color: '#94a3b8', width: 1.5, enabled: true },
        { id: 'FC-2', label: 'Fase C2', phase: 'FASE C', h: 8.3, vRatio: 0.85, vOffset: -0.15, color: '#94a3b8', width: 1.5, enabled: true },
        { id: 'FC-3', label: 'Fase C3', phase: 'FASE C', h: 9.3, vRatio: 0.85, vOffset: 0.15, color: '#94a3b8', width: 1.5, enabled: true },
        { id: 'FC-4', label: 'Fase C4', phase: 'FASE C', h: 9.3, vRatio: 0.85, vOffset: -0.15, color: '#94a3b8', width: 1.5, enabled: true },
    ]
};

const PRESET_COLORS = [
    '#cbd5e1', // Alumínio Claro
    '#94a3b8', // Aço Polido
    '#e2e8f0', // Prata Brilhante
    '#475569', // Aço Escuro
    '#ffffff', // Branco/Reflexo
    '#00ffff', '#1e88e5', '#43a047', '#ff7043',
    '#ab47bc'
];

interface CableConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: CableSettings;
    onSave: (settings: CableSettings) => void;
}

export function CableConfigModal({ isOpen, onClose, settings, onSave }: CableConfigModalProps) {
    const [localSettings, setLocalSettings] = useState<CableSettings>(settings);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
    const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings, isOpen]);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, id });
    };

    const handleDeleteFromContextMenu = () => {
        if (contextMenu) {
            removeCable(contextMenu.id);
            setContextMenu(null);
        }
    };

    const addPhase = (phaseName: string) => {
        const timestamp = Date.now();
        const baseH = phaseName.includes('FASE A') ? 8 : phaseName.includes('FASE B') ? 8.5 : phaseName.includes('FASE C') ? 9 : 3;
        const vRatio = phaseName.includes('FASE A') ? 0.85 : phaseName.includes('FASE B') ? 0.65 : phaseName.includes('FASE C') ? 0.45 : 1.0;
        const color = phaseName.includes('FASE') ? '#ffffff' : '#00ffff';

        const newAnchors: CableAnchorConfig[] = [
            { id: `${phaseName}-1-L-${timestamp}`, label: `${phaseName} 1 Esq`, phase: phaseName, h: -baseH, vRatio, vOffset: 0, color, width: 3, enabled: true },
            { id: `${phaseName}-2-L-${timestamp}`, label: `${phaseName} 2 Esq`, phase: phaseName, h: -(baseH + 1), vRatio, vOffset: 0, color, width: 3, enabled: true },
            { id: `${phaseName}-3-L-${timestamp}`, label: `${phaseName} 3 Esq`, phase: phaseName, h: -(baseH + 2), vRatio, vOffset: 0, color, width: 3, enabled: true },
            { id: `${phaseName}-4-L-${timestamp}`, label: `${phaseName} 4 Esq`, phase: phaseName, h: -(baseH + 3), vRatio, vOffset: 0, color, width: 3, enabled: true },
        ];

        setLocalSettings(prev => ({
            ...prev,
            anchors: [...(prev?.anchors || []), ...newAnchors]
        }));
    };

    const addCable = () => {
        const newId = `custom-${Date.now()}`;
        const currentAnchors = localSettings?.anchors || [];
        const newAnchor: CableAnchorConfig = {
            id: newId,
            label: `Cabo Personalizado ${currentAnchors.length + 1}`,
            phase: 'OUTROS',
            h: 0,
            vRatio: 0.5,
            vOffset: 0,
            color: '#ffffff',
            width: 3,
            enabled: true
        };
        setLocalSettings(prev => ({
            ...prev,
            anchors: [...(prev?.anchors || []), newAnchor]
        }));
        setSelectedAnchorId(newId);
    };

    const removeCable = (id: string) => {
        setLocalSettings(prev => ({
            ...prev,
            anchors: (prev?.anchors || []).filter(a => a.id !== id)
        }));
        if (selectedAnchorId === id) {
            setSelectedAnchorId(null);
        }
    };

    if (!isOpen) return null;

    const anchors = localSettings?.anchors || [];
    const selectedAnchor = anchors.find(a => a.id === selectedAnchorId);
    const phases = Array.from(new Set(anchors.map(a => a.phase || 'SEM FASE')));

    const updateAnchor = (id: string, updates: Partial<CableAnchorConfig>) => {
        setLocalSettings(prev => ({
            ...prev,
            anchors: (prev?.anchors || []).map(a => a.id === id ? { ...a, ...updates } : a)
        }));
    };

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    const handleReset = () => {
        setLocalSettings(prev => ({
            ...prev,
            anchors: prev.anchors.map(anchor => {
                const defaultAnchor = DEFAULT_CABLE_SETTINGS.anchors.find(da => da.id === anchor.id);
                if (defaultAnchor) {
                    return {
                        ...anchor,
                        color: defaultAnchor.color,
                        width: defaultAnchor.width,
                        // DO NOT RESET: h, vRatio, vOffset
                    };
                }
                return anchor;
            })
        }));
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            {contextMenu && (
                <div
                    className="fixed z-50 bg-zinc-800 border border-white/10 rounded-lg shadow-xl py-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFromContextMenu();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Excluir Cabo
                    </button>
                </div>
            )}

            <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-linear-to-r from-zinc-900 via-zinc-900 to-cyan-500/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/20">
                            <Cable className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-white">
                                Configuração de Cabos 3D
                            </h2>
                            <p className="text-xs text-white/50">Ajuste fino dos pontos de ancoragem e aparência</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left Panel - Anchor List Scrollable */}
                    <div className="w-1/2 overflow-y-auto p-5 border-r border-white/5 custom-scrollbar">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40">
                                <Settings2 className="w-4 h-4" />
                                Pontos de Ancoragem
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => addPhase('FASE A')} className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[9px] font-black border border-cyan-500/20">+ Fase A</button>
                                <button onClick={() => addPhase('FASE B')} className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[9px] font-black border border-cyan-500/20">+ Fase B</button>
                                <button onClick={() => addPhase('FASE C')} className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[9px] font-black border border-cyan-500/20">+ Fase C</button>
                                <button onClick={addCable} className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {phases.map(phase => (
                                <div key={phase} className="space-y-2">
                                    <div className="px-2 py-1 bg-white/5 border-l-2 border-cyan-500 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{phase}</span>
                                        <span className="text-[8px] text-white/30 font-bold">{anchors.filter(a => a.phase === phase).length} CABOS</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {anchors.filter(a => a.phase === phase).map(anchor => (
                                            <div
                                                key={anchor.id}
                                                onContextMenu={(e) => handleContextMenu(e, anchor.id)}
                                                onClick={() => setSelectedAnchorId(anchor.id)}
                                                className={cn(
                                                    "w-full p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer relative group",
                                                    selectedAnchorId === anchor.id ? "bg-cyan-500/25 border-cyan-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
                                                )}
                                            >
                                                <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: anchor.color }} />
                                                <div className="flex flex-col items-start min-w-0 flex-1">
                                                    <span className="text-[11px] font-bold text-white truncate leading-tight uppercase tracking-tight">{anchor.label}</span>
                                                    <span className="text-[9px] text-white/40 tabular-nums uppercase">H:{anchor.h.toFixed(1)}m V:{Math.round(anchor.vRatio * 100)}%</span>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={anchor.enabled}
                                                        onChange={(e) => { e.stopPropagation(); updateAnchor(anchor.id, { enabled: e.target.checked }); }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel - Details Scrollable */}
                    <div className="w-1/2 overflow-y-auto p-5 custom-scrollbar bg-black/20">
                        {selectedAnchor ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40"><Palette className="w-4 h-4" /> Cor do Cabo</div>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_COLORS.map(color => (
                                            <button key={color} onClick={() => updateAnchor(selectedAnchor.id, { color })} className={cn("w-8 h-8 rounded-lg border-2", selectedAnchor.color === color ? "border-white scale-110" : "border-transparent")} style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                    <Input value={selectedAnchor.color} onChange={(e) => updateAnchor(selectedAnchor.id, { color: e.target.value })} className="bg-black/40 border-white/10 text-white font-mono text-sm" />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40"><Move className="w-4 h-4" /> Propriedades</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-white/50 mb-1 block uppercase font-bold">Fase / Grupo</label>
                                            <Input value={selectedAnchor.phase || ''} onChange={(e) => updateAnchor(selectedAnchor.id, { phase: e.target.value.toUpperCase() })} className="bg-black/40 border-white/10 text-white font-bold uppercase text-xs" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-white/50 mb-1 block uppercase font-bold">Etiqueta</label>
                                            <Input value={selectedAnchor.label} onChange={(e) => updateAnchor(selectedAnchor.id, { label: e.target.value })} className="bg-black/40 border-white/10 text-white font-bold uppercase text-xs" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-white/50 mb-1 block uppercase font-bold">ID do Circuito</label>
                                            <Input value={selectedAnchor.circuitId || ''} placeholder="Ex: C1" onChange={(e) => updateAnchor(selectedAnchor.id, { circuitId: e.target.value.toUpperCase() })} className="bg-black/40 border-white/10 text-white font-bold uppercase text-xs" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-white/50 mb-1 block uppercase font-bold">Offset Horiz (m)</label>
                                            <Input type="number" step="0.5" value={selectedAnchor.h} onChange={(e) => updateAnchor(selectedAnchor.id, { h: parseFloat(e.target.value) || 0 })} className="bg-black/40 border-white/10 text-white" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-white/50 mb-1 block uppercase font-bold">Offset Vert (m)</label>
                                            <Input type="number" step="0.5" value={selectedAnchor.vOffset || 0} onChange={(e) => updateAnchor(selectedAnchor.id, { vOffset: parseFloat(e.target.value) || 0 })} className="bg-black/40 border-white/10 text-white" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] text-white/50 mb-1 block uppercase font-bold">Altura Relativa: {Math.round(selectedAnchor.vRatio * 100)}%</label>
                                            <Slider value={[selectedAnchor.vRatio * 100]} onValueChange={([v]) => updateAnchor(selectedAnchor.id, { vRatio: v / 100 })} min={0} max={100} step={1} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/40">Espessura: {selectedAnchor.width}px</div>
                                    <Slider value={[selectedAnchor.width]} onValueChange={([v]) => updateAnchor(selectedAnchor.id, { width: v })} min={1} max={10} step={1} />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-white/20 text-[10px] font-black uppercase">Selecione um ponto para editar</div>
                        )}

                        <div className="mt-8 pt-6 border-t border-white/5 space-y-6">
                            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40"><Gauge className="w-4 h-4" /> Global</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-white/50 mb-1 block uppercase font-bold">Tensão</label>
                                    <Input type="number" value={localSettings.tension} onChange={(e) => setLocalSettings(prev => ({ ...prev, tension: parseFloat(e.target.value) || 1200 }))} className="bg-black/40 border-white/10 text-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-white/50 mb-1 block uppercase font-bold">Opacidade %</label>
                                    <Input type="number" value={Math.round(localSettings.globalOpacity * 100)} onChange={(e) => setLocalSettings(prev => ({ ...prev, globalOpacity: (parseFloat(e.target.value) || 90) / 100 }))} className="bg-black/40 border-white/10 text-white" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-white/50 mb-1 uppercase font-bold flex items-center gap-1"><ArrowUp className="w-3 h-3" /> Elevar Torres (m)</label>
                                    <Input type="number" value={localSettings.towerVerticalOffset} onChange={(e) => setLocalSettings(prev => ({ ...prev, towerVerticalOffset: parseFloat(e.target.value) || 0 }))} className="bg-black/40 border-white/10 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-5 border-t border-white/5 bg-black/40">
                    <Button variant="ghost" onClick={handleReset} className="text-white/40 hover:text-white uppercase text-[10px] font-black">Restaurar Padrão</Button>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="border-white/10 text-[10px] font-black uppercase">Cancelar</Button>
                        <Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-black font-black text-[10px] uppercase px-8">Aplicar</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
