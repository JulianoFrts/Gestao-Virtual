import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Info, Layers, Boxes, Hash, Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TowerDetailsModalsProps {
    isOpen: boolean;
    onClose: () => void;
    tower: any | null;
}

export function TowerDetailsModals({ isOpen, onClose, tower }: TowerDetailsModalsProps) {
    console.log("TowerDetailsModals Render - isOpen:", isOpen, "Tower:", tower?.name);
    if (!tower) return null;

    const handleNavigate = () => {
        const { lat, lng } = tower.coordinates;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[360px] bg-black/95 border-white/5 backdrop-blur-2xl text-white p-0 overflow-hidden rounded-3xl shadow-2xl border">
                {/* Header Decoration - Premium OrioN Style */}
                <div className="h-28 bg-linear-to-br from-emerald-500/20 via-black to-black relative flex items-end p-5 border-b border-white/5 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full animate-pulse" />
                    <div className="absolute top-4 right-4 flex gap-2">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded-full">
                            TÉCNICO
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.3)] border border-white/10">
                            <Boxes className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black italic tracking-tighter text-white uppercase leading-none">
                                    {tower.name}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-white/10 text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md text-emerald-400 border border-white/5">
                                    ESTRUTURA #{tower.id?.slice(0, 6).toUpperCase() || "NEW"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl group hover:bg-white/10 transition-all duration-500">
                            <h4 className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Ruler className="w-3 h-3 text-emerald-500" /> Altitude
                            </h4>
                            <p className="text-xl font-black text-white italic tracking-tighter">
                                {Number(tower.coordinates.altitude).toFixed(2)}<span className="text-[10px] not-italic ml-1 text-neutral-500">M</span>
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl group hover:bg-white/10 transition-all duration-500">
                            <h4 className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Layers className="w-3 h-3 text-emerald-500" /> Categoria
                            </h4>
                            <p className="text-xl font-black text-white italic tracking-tighter uppercase">
                                {tower.type?.split(' ')[0] || "TIPO"}
                            </p>
                        </div>
                    </div>

                    {/* Coordinates Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em]">Geolocalização</h4>
                            <MapPin className="w-3 h-3 text-emerald-500" />
                        </div>
                        <div className="bg-black/40 rounded-2xl p-1.5 border border-white/5 space-y-1">
                            {[
                                { label: "Latitude", val: tower.coordinates.lat.toFixed(7) },
                                { label: "Longitude", val: tower.coordinates.lng.toFixed(7) }
                            ].map((coord, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all">
                                    <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">{coord.label}</span>
                                    <span className="text-xs font-black font-mono text-emerald-400 tracking-tight">{coord.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Button - Ultra Premium */}
                    <Button
                        onClick={handleNavigate}
                        className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] uppercase tracking-widest rounded-xl shadow-[0_15px_30px_rgba(16,185,129,0.2)] transition-all hover:scale-[1.02] active:scale-95 group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-20 group-hover:translate-y-0 transition-transform duration-500" />
                        <span className="relative z-10 flex items-center gap-2">
                            <Navigation className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            GPS: NAVEGADOR
                        </span>
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-neutral-600 text-[9px] font-black uppercase tracking-widest pt-2">
                        <Info className="w-3 h-3 text-emerald-500/50" /> Sincronizado via OrioN Cloud Layer
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
