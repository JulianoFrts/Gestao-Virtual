import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Layers,
    Settings2,
    Check
} from "lucide-react";
import { Tower as TowerType } from "../types";
import { TOWER_MODELS_CONFIG } from "../constants/map-config";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface TowerTypeConfigurationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    towers: TowerType[];
    onUpdateTower?: (id: string, updates: Partial<TowerType>) => void;
}

export const TowerTypeConfigurationModal: React.FC<TowerTypeConfigurationModalProps> = ({
    open,
    onOpenChange,
    towers,
    onUpdateTower
}) => {
    const uniqueTypes = Array.from(new Set(towers.map(t => t.type?.toUpperCase() || "N/A")));

    const handleApplyModel = (type: string, modelId: string) => {
        const modelUrl = TOWER_MODELS_CONFIG.find(c => c.id === modelId)?.modelUrl;
        towers.filter(t => t.type?.toUpperCase() === type)
              .forEach(t => onUpdateTower?.(t.id, { modelUrl }));
    };

    const handleApplyFunction = (type: string, towerFunction: string) => {
        towers.filter(t => t.type?.toUpperCase() === type)
              .forEach(t => onUpdateTower?.(t.id, { towerFunction }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-black/95 border-white/10 p-0 flex flex-col overflow-hidden backdrop-blur-3xl rounded-3xl">
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-blue-500/10 to-transparent">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center ring-1 ring-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                <Layers className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black italic tracking-tighter text-white uppercase">
                                    Configuração por Tipo
                                </DialogTitle>
                                <DialogDescription className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                                    Ajuste de modelos e funções em lote
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[60vh] p-6">
                    <div className="space-y-4">
                        {uniqueTypes.map(type => {
                            const count = towers.filter(t => t.type?.toUpperCase() === type).length;
                            return (
                                <div key={type} className="p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4 group hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Settings2 className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-black text-white italic tracking-tight">{type}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest">
                                            {count} Torres Encontradas
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Modelo 3D Global</span>
                                            <Select onValueChange={(val) => handleApplyModel(type, val)}>
                                                <SelectTrigger className="h-10 bg-white/5 border-white/10 rounded-xl text-[10px] font-bold uppercase text-blue-400">
                                                    <SelectValue placeholder="SELECIONAR MODELO..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-black border-white/10">
                                                    {TOWER_MODELS_CONFIG.map(config => (
                                                        <SelectItem key={config.id} value={config.id} className="text-[10px] font-bold uppercase tracking-widest focus:bg-blue-500">
                                                            {config.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Função da Cadeia</span>
                                            <Select onValueChange={(val) => handleApplyFunction(type, val)}>
                                                <SelectTrigger className="h-10 bg-white/5 border-white/10 rounded-xl text-[10px] font-bold uppercase text-blue-400">
                                                    <SelectValue placeholder="SELECIONAR FUNÇÃO..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-black border-white/10">
                                                    <SelectItem value="SUSPENSÃO" className="text-[10px] font-bold uppercase tracking-widest focus:bg-blue-500">Suspensão</SelectItem>
                                                    <SelectItem value="ANCORAGEM" className="text-[10px] font-bold uppercase tracking-widest focus:bg-blue-500">Ancoragem</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="p-8 border-t border-white/5 bg-white/2 flex justify-end items-center">
                    <Button 
                        onClick={() => onOpenChange(false)}
                        className="h-12 px-10 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                    >
                        Concluir Ajustes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
