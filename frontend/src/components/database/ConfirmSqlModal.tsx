import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Terminal, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmSqlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    sql: string;
    title: string;
    description: string;
    loading?: boolean;
}

export function ConfirmSqlModal({
    isOpen,
    onClose,
    onConfirm,
    sql,
    title,
    description,
    loading
}: ConfirmSqlModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(val) => !loading && !val && onClose()}>
            <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 p-0 overflow-hidden rounded-3xl shadow-2xl">
                {/* Warning Header */}
                <div className="bg-amber-500/10 p-6 border-b border-amber-500/20 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center ring-1 ring-amber-500/30">
                        <AlertTriangle className="text-amber-500 w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-white mb-1">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-amber-500/70 font-medium text-sm">
                            Esta ação alterará a estrutura do banco de dados permanentemente.
                        </DialogDescription>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <p className="text-sm text-slate-400 font-medium">{description}</p>
                    </div>

                    {/* SQL Preview */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">
                            <Terminal className="w-3 h-3" />
                            SQL a ser executado
                        </div>
                        <div className="bg-black/60 rounded-xl p-4 border border-white/5 font-mono text-sm text-cyan-50 whitespace-pre-wrap break-all shadow-inner max-h-[200px] overflow-y-auto">
                            {sql}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 flex gap-3 justify-end">
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        disabled={loading}
                        className="rounded-xl h-12 px-6 font-bold text-slate-500 hover:text-white uppercase text-[10px] tracking-widest"
                    >
                        CANCELAR
                    </Button>
                    <Button 
                        onClick={onConfirm} 
                        disabled={loading}
                        className="rounded-xl h-12 px-10 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-lg shadow-amber-900/20 flex gap-3"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>CONFIRMAR ALTERAÇÃO <ArrowRight className="w-5 h-5" /></>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
