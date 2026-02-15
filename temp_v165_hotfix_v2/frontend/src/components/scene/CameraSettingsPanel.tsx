import React from 'react';
import { Settings2, RotateCw, Move, MousePointer2 } from 'lucide-react';
import { useCameraStore } from '@/store/useCameraStore';
import { Slider } from '@/components/ui/slider';

export function CameraSettingsPanel() {
    const { sensitivity, setSensitivity } = useCameraStore();

    return (
        <div className="absolute top-28 left-6 z-20 bg-zinc-900/90 backdrop-blur-md text-white p-4 rounded-2xl w-64 shadow-2xl border border-white/10 flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-cyan-500/20">
                    <Settings2 className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Câmera</h3>
                    <p className="text-[10px] text-white/40 uppercase font-bold leading-none">Ajuste de Sensibilidade</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-white/50">
                        <div className="flex items-center gap-1.5">
                            <RotateCw className="w-3 h-3" /> Rotação
                        </div>
                        <span className="text-cyan-400 font-mono">{sensitivity.rotate.toFixed(1)}</span>
                    </div>
                    <Slider
                        value={[sensitivity.rotate * 10]}
                        onValueChange={([v]) => setSensitivity({ rotate: v / 10 })}
                        min={1}
                        max={10}
                        step={1}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-white/50">
                        <div className="flex items-center gap-1.5">
                            <MousePointer2 className="w-3 h-3" /> Zoom (Dolly)
                        </div>
                        <span className="text-cyan-400 font-mono">{sensitivity.dolly.toFixed(1)}</span>
                    </div>
                    <Slider
                        value={[sensitivity.dolly * 10]}
                        onValueChange={([v]) => setSensitivity({ dolly: v / 10 })}
                        min={1}
                        max={10}
                        step={1}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-white/50">
                        <div className="flex items-center gap-1.5">
                            <Move className="w-3 h-3" /> Pan (Truck)
                        </div>
                        <span className="text-cyan-400 font-mono">{sensitivity.truck.toFixed(1)}</span>
                    </div>
                    <Slider
                        value={[sensitivity.truck * 10]}
                        onValueChange={([v]) => setSensitivity({ truck: v / 10 })}
                        min={1}
                        max={10}
                        step={1}
                    />
                </div>
            </div>
        </div>
    );
}
