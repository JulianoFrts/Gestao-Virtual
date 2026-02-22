import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, LogOut, Lock, RefreshCw, ChevronDown } from 'lucide-react';
import { simulationRoleSignal, isMapperModeActiveSignal } from '@/signals/authSignals';
import { useSignals } from '@preact/signals-react/runtime';
import { getRoleLabel } from '@/utils/roleUtils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DevTopBanner() {
    useSignals();
    const { switchRole, profile } = useAuth();

    // Só renderiza em localhost E modo desenvolvimento
    const isDev = import.meta.env.DEV && window.location.hostname === 'localhost';
    if (!isDev) return null;

    const roles = [
        { id: 'HELPER_SYSTEM', label: 'Suporte Especializado', pts: '2000 PTS', icon: Shield },
        { id: 'SUPER_ADMIN_GOD', label: 'Super Admin God', pts: '1500 PTS', icon: Shield },
        { id: 'SOCIO_DIRETOR', label: 'Sócio Diretor', pts: '1000 PTS', icon: Shield },
        { id: 'ADMIN', label: 'Admin', pts: '950 PTS', icon: Shield },
        { id: 'TI_SOFTWARE', label: 'Ti-Software', pts: '900 PTS', icon: Shield },
        { id: 'MODERATOR', label: 'Moderador', pts: '850 PTS', icon: Shield },
        { id: 'MANAGER', label: 'Gerente', pts: '850 PTS', icon: Shield },
        { id: 'GESTOR_PROJECT', label: 'Gestor de Obra', pts: '800 PTS', icon: Shield },
        { id: 'GESTOR_CANTEIRO', label: 'Gestor de Canteiro', pts: '750 PTS', icon: Shield },
        { id: 'SUPERVISOR', label: 'Supervisor', pts: '500 PTS', icon: Shield },
        { id: 'WORKER', label: 'Colaborador', pts: '200 PTS', icon: Shield },
        { id: 'VIEWER', label: 'Visualizador', pts: '100 PTS', icon: Shield },
    ];

    const isMapperActive = isMapperModeActiveSignal.value;
    const isSimulating = !!simulationRoleSignal.value;

    return (
        <div className="bg-slate-950 border-b border-primary/20 text-white px-4 py-1.5 flex flex-wrap items-center justify-between text-[10px] font-bold tracking-tight shadow-strong z-50">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-primary/70 uppercase">Dev Mode</span>
                </div>

                <div className="h-4 w-px bg-white/10 hidden sm:block" />

                {/* Seletor de Perfis */}
                <div className="flex items-center gap-2">
                    <span className="text-white/40 uppercase hidden lg:block">Simular:</span>
                    <Select 
                        value={simulationRoleSignal.value || profile?.role} 
                        onValueChange={(val) => switchRole(val)}
                    >
                        <SelectTrigger className="h-7 w-48 bg-white/5 border-white/10 text-white text-[10px] rounded-lg hover:bg-white/10 transition-colors">
                            <SelectValue placeholder="Escolher papel..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-white/10 p-0 overflow-hidden shadow-2xl">
                            <ScrollArea className="h-64">
                                <div className="p-1 space-y-1">
                                    {roles.map((role) => (
                                        <SelectItem 
                                            key={role.id} 
                                            value={role.id}
                                            className="focus:bg-primary/20 focus:text-primary rounded-lg cursor-pointer py-2 transition-all"
                                        >
                                            <div className="flex items-center justify-between w-full pr-4 gap-4">
                                                <span className="text-[10px] font-semibold">{role.label}</span>
                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                                                    {role.pts}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </div>
                            </ScrollArea>
                        </SelectContent>
                    </Select>
                </div>

                {/* Sair da Simulação */}
                {isSimulating && (
                    <button 
                        onClick={() => switchRole(null)}
                        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg transition-all border border-red-500/20 active:scale-95 group"
                    >
                        <LogOut className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                        Restaurar Acesso Real
                    </button>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Permission Mapper (Raio-X) */}
                <button 
                    onClick={() => isMapperModeActiveSignal.value = !isMapperActive}
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all border active:scale-95 ${
                        isMapperActive 
                        ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_15px_-5px_rgba(147,51,234,0.5)]' 
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                >
                    <Lock className={`w-3 h-3 ${isMapperActive ? 'animate-bounce' : ''}`} />
                    <span className="uppercase">{isMapperActive ? 'Raio-X Ativo' : 'Ativar Raio-X'}</span>
                </button>

                <div className="h-4 w-px bg-white/10 hidden sm:block" />

                <div className="hidden sm:flex items-center gap-2 text-white/30 truncate max-w-[200px]">
                    <span className="uppercase tracking-widest text-[8px]">Uid:</span>
                    <span className="font-mono">{profile?.fullName || '---'}</span>
                </div>
            </div>
        </div>
    );
}
