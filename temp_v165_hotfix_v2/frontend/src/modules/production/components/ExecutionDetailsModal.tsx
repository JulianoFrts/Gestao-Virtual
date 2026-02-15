import React from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, AlertTriangle, MessageSquare } from "lucide-react";
import { TowerActivityStatus } from "../types";

interface ExecutionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    towerName: string;
    activityName: string;
    statusData?: TowerActivityStatus;
    onSaveNotes?: (notes: string) => Promise<void>;
}

export default function ExecutionDetailsModal({
    isOpen,
    onClose,
    towerName,
    activityName,
    statusData,
    onSaveNotes
}: ExecutionDetailsModalProps) {
    const [notes, setNotes] = React.useState(statusData?.notes || "");
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        setNotes(statusData?.notes || "");
    }, [statusData]);

    const handleSave = async () => {
        if (onSaveNotes) {
            setIsSaving(true);
            try {
                await onSaveNotes(notes);
                onClose();
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (!statusData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-500">
                        <MessageSquare className="w-5 h-5" />
                        Detalhes de Execução
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {towerName} - <span className="text-sky-400 font-bold">{activityName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Status Overview */}
                    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-500 font-bold">Status Atual</span>
                            <Badge variant={statusData.status === 'FINISHED' ? 'default' : 'secondary'} 
                                className={statusData.status === 'FINISHED' ? 'bg-emerald-500/20 text-emerald-400 mt-1' : 'bg-sky-500/20 text-sky-400 mt-1'}>
                                {statusData.status === 'FINISHED' ? 'CONCLUÍDO' : statusData.status === 'IN_PROGRESS' ? 'EM ANDAMENTO' : 'PENDENTE'}
                            </Badge>
                        </div>
                        <div className="flex flex-col items-end">
                             <span className="text-[10px] uppercase text-slate-500 font-bold">Avanço</span>
                             <span className="text-xl font-bold font-mono text-white">{statusData.progressPercent || 0}%</span>
                        </div>
                    </div>

                    {/* Dates Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold">Início Real</Label>
                            <div className="flex items-center gap-2 text-sm font-mono bg-black/20 p-2 rounded border border-white/5">
                                <CalendarIcon className="w-4 h-4 text-emerald-500" />
                                {statusData.startDate ? format(new Date(statusData.startDate), "dd/MM/yyyy") : "-"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold">Fim Real</Label>
                            <div className="flex items-center gap-2 text-sm font-mono bg-black/20 p-2 rounded border border-white/5">
                                <CalendarIcon className="w-4 h-4 text-rose-500" />
                                {statusData.endDate ? format(new Date(statusData.endDate), "dd/MM/yyyy") : "-"}
                            </div>
                        </div>
                    </div>

                    {/* Delay Info if present */}
                    {statusData.impedimentType && statusData.impedimentType !== 'NONE' && (
                        <div className="bg-rose-950/20 border border-rose-900/50 p-3 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-rose-400 uppercase">Impedimento / Atraso</h4>
                                <p className="text-xs text-rose-300/80 mt-1">
                                    Tipo: {statusData.impedimentType}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-400">Comentários / Observações</Label>
                        <Textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Adicione informações sobre atrasos, planejamento ou execução..."
                            className="bg-slate-900 border-slate-800 focus:border-amber-500/50 min-h-[100px] text-sm"
                        />
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                     <div className="text-[10px] text-slate-600 self-center">
                        ID: {statusData.progressId || 'N/A'}
                     </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} size="sm">Fechar</Button>
                        <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-amber-600 hover:bg-amber-700">
                            {isSaving ? "Salvando..." : "Salvar Notas"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
