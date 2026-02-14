import React, { useState } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProjectSelector } from './ProjectSelector';
import { HardHat, Rocket, ArrowRight } from 'lucide-react';
import { projects as projectsSignal, selectedProjectSignal } from '@/signals/globalDataSignals';
import { useSignals } from '@preact/signals-react/runtime';

interface ProjectModuleSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelection: (projectId: string) => void;
    moduleName: string;
}

export function ProjectModuleSelectionModal({ 
    isOpen, 
    onClose, 
    onSelection,
    moduleName 
}: ProjectModuleSelectionModalProps) {
    useSignals();
    const [selectedId, setSelectedId] = useState<string>('');

    const handleConfirm = () => {
        if (!selectedId) return;
        
        // Update global signal
        const project = projectsSignal.value.find(p => p.id === selectedId);
        if (project) {
            selectedProjectSignal.value = project;
            // Also persist to localStorage for GAPO and other modules that use it
            localStorage.setItem('gapo_project_id', project.id);
            localStorage.setItem('selected_project_id', project.id);
        }

        onSelection(selectedId);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[450px] glass-dark border-white/10 p-0 overflow-hidden">
                <div className="relative h-2 w-full gradient-primary" />
                
                <DialogHeader className="p-6 pb-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <HardHat className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                        Selecionar Obra
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-muted-foreground italic">
                        Para acessar o <span className="text-primary font-bold not-italic">{moduleName}</span>, selecione uma obra ativa abaixo.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 py-8 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Obras Disponíveis
                        </label>
                        <ProjectSelector 
                            value={selectedId} 
                            onValueChange={setSelectedId}
                            showAll={false}
                            className="w-full"
                            placeholder="Escolha a obra para prosseguir..."
                        />
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                            <Rocket className="w-3 h-3" />
                            Por que selecionar agora?
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Ao selecionar uma obra, todos os painéis, auditorias e KPIs serão pré-filtrados automaticamente para este contexto.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white/5 border-t border-white/5 gap-2">
                    <Button 
                        variant="ghost" 
                        onClick={onClose}
                        className="text-xs font-black uppercase tracking-widest h-11"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        className="gradient-primary text-xs font-black uppercase tracking-widest h-11 px-8 gap-2 group"
                    >
                        Entrar no Módulo
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
