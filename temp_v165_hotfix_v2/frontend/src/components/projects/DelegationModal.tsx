import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { DelegationPanel } from './DelegationPanel';

interface DelegationModalProps {
    projectId: string;
    projectName: string;
    trigger?: React.ReactNode;
}

/**
 * Modal dedicado para Delegação de Poderes Extras.
 * Separado do modal de edição de obra para melhor organização.
 */
export function DelegationModal({ projectId, projectName, trigger }: DelegationModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary"
                    >
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="hidden sm:inline">Delegação de Poderes</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Shield className="text-primary w-5 h-5" />
                        </div>
                        Delegação de Poderes
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground pt-1">
                        Configure permissões extras para cargos específicos na obra <span className="font-semibold text-foreground">{projectName}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <DelegationPanel projectId={projectId} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
