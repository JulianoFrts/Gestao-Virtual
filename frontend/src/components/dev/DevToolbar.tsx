import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, User, Users, Eye, X, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { simulationRoleSignal, isMapperModeActiveSignal } from '@/signals/authSignals';
import { useSignals } from '@preact/signals-react/runtime';
import {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const DevToolbar: React.FC = () => {
    useSignals();
    const { switchRole, profile } = useAuth();
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Só renderiza em localhost E modo desenvolvimento
    const isDev = import.meta.env.DEV && window.location.hostname === 'localhost';
    if (!isDev) return null;

    const roles = [
        { id: 'HELPER_SYSTEM', label: 'Suporte Especializado', pts: '2000 PTS', icon: Shield },
        { id: 'SUPER_ADMIN_GOD', label: 'Super Admin God', pts: '1500 PTS', icon: Shield },
        { id: 'SOCIO_DIRETOR', label: 'Sócio Diretor', pts: '1000 PTS', icon: Users },
        { id: 'ADMIN', label: 'Admin', pts: '950 PTS', icon: Users },
        { id: 'TI_SOFTWARE', label: 'Ti-Software', pts: '900 PTS', icon: User },
        { id: 'MODERATOR', label: 'Moderador', pts: '850 PTS', icon: User },
        { id: 'MANAGER', label: 'Gerente', pts: '850 PTS', icon: User },
        { id: 'GESTOR_PROJECT', label: 'Gestor de Obra', pts: '800 PTS', icon: User },
        { id: 'GESTOR_CANTEIRO', label: 'Gestor de Canteiro', pts: '750 PTS', icon: User },
        { id: 'SUPERVISOR', label: 'Supervisor', pts: '500 PTS', icon: Eye },
        { id: 'WORKER', label: 'Colaborador', pts: '200 PTS', icon: User },
        { id: 'VIEWER', label: 'Visualizador', pts: '100 PTS', icon: Eye },
    ];

    const currentRole = simulationRoleSignal.value || (profile?.role as string);
    const isMapperActive = isMapperModeActiveSignal.value;

    return (
        <div className="fixed bottom-4 right-4 z-9999 flex flex-col items-end gap-2">
            {isExpanded && (
                <div className="bg-slate-950/95 border border-primary/20 p-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300 w-64">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <h3 className="text-[10px] font-black tracking-widest text-white/50 uppercase">Dev Console</h3>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:text-white" onClick={() => setIsExpanded(false)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {/* Seletor de Role */}
                        <div>
                            <label className="text-[9px] font-bold text-primary/60 uppercase block mb-2 px-1">Simular Perfil</label>
                            <Select 
                                value={simulationRoleSignal.value || profile?.role} 
                                onValueChange={(val) => switchRole(val)}
                            >
                                <SelectTrigger className="w-full h-10 bg-white/5 border-white/10 text-white text-[11px] rounded-xl hover:bg-white/10 transition-colors">
                                    <SelectValue placeholder="Selecione um papel..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-white/10 p-0 overflow-hidden shadow-2xl">
                                    <ScrollArea className="h-64">
                                        <div className="p-1 space-y-1">
                                            {roles.map((role) => (
                                                <SelectItem 
                                                    key={role.id} 
                                                    value={role.id}
                                                    className="focus:bg-primary/20 focus:text-primary rounded-lg cursor-pointer py-2.5 transition-all"
                                                >
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <role.icon className="h-3.5 w-3.5 opacity-50" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-semibold">{role.label}</span>
                                                                <span className="text-[8px] opacity-40 uppercase tracking-tighter">{role.id}</span>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                                            role.id.includes('ADMIN') || role.id.includes('SYSTEM') 
                                                            ? 'bg-amber-500/20 text-amber-400' 
                                                            : 'bg-white/10 text-white/40'
                                                        }`}>
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

                        {/* Reset */}
                        {simulationRoleSignal.value && (
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="w-full h-8 text-[10px] font-bold"
                                onClick={() => switchRole(null)}
                            >
                                <X className="h-3 w-3 mr-2" />
                                Restaurar Acesso Real
                            </Button>
                        )}

                        {/* Mapper Mode */}
                        <Button 
                            variant={isMapperActive ? "default" : "outline"} 
                            size="sm" 
                            className={`w-full h-8 border-dashed ${isMapperActive ? 'bg-purple-600 border-purple-400' : 'border-primary/30 text-primary/60 hover:bg-primary/5'} text-[10px] font-bold`}
                            onClick={() => {
                                isMapperModeActiveSignal.value = !isMapperActive;
                            }}
                        >
                            <Lock className={`h-3 w-3 mr-2 ${isMapperActive ? 'animate-bounce' : ''}`} />
                            {isMapperActive ? 'MAPPER ATIVO (RAIO-X)' : 'PERMISSION MAPPER'}
                        </Button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 text-center">
                        <p className="text-[9px] text-white/20">Identidade Atual: <strong>{profile?.fullName}</strong></p>
                    </div>
                </div>
            )}

            <Button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`rounded-full w-12 h-12 shadow-xl shadow-primary/20 p-0 transition-all duration-500 hover:scale-110 active:scale-95 ${simulationRoleSignal.value ? 'bg-amber-600 animate-pulse' : 'gradient-primary'}`}
            >
                {isExpanded ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
            </Button>
        </div>
    );
};
