import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useProductionLogs, type ProductionLog } from '@/hooks/useProductionLogs';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, XCircle, AlertTriangle, User, MapPin, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface GAPOValidationListProps {
    projectId?: string;
}

export default function GAPOValidationList({ projectId }: GAPOValidationListProps) {
    const { data: logs = [], isLoading, approve, isApproving } = useProductionLogs(true);
    const { toast } = useToast();

    // Context-aware filtering
    const filteredLogs = useMemo(() => {
        if (!projectId) return logs;
        return logs.filter(log => {
            const tower = log.tower as any;
            const meta = log as any;
            return !projectId || tower?.project_id === projectId || meta.metadata?.projectId === projectId;
        });
    }, [logs, projectId]);

    // Use filteredLogs instead of logs for rendering
    const displayLogs = projectId ? filteredLogs : logs;

    const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
    const [auditNote, setAuditNote] = useState('');
    const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'bulk_approve' | 'bulk_reject' | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);

    const handleAction = async () => {
        if ((!selectedLog && !modalAction?.startsWith('bulk_')) || !modalAction) return;

        try {
            if (modalAction === 'bulk_approve' || modalAction === 'bulk_reject') {
                setIsProcessingBulk(true);
                const isApproved = modalAction === 'bulk_approve';
                
                // Process each selected log
                for (const logId of selectedIds) {
                    await approve({
                        logId,
                        approved: isApproved,
                        reason: auditNote || `Processamento em massa via GAPO.`
                    });
                }

                toast({
                    title: isApproved ? 'Aprovação em Massa Concluída' : 'Rejeição em Massa Concluída',
                    description: `${selectedIds.length} registros foram processados com sucesso.`,
                });
                
                setSelectedIds([]);
            } else if (selectedLog) {
                await approve({
                    logId: selectedLog.id,
                    approved: modalAction === 'approve',
                    reason: auditNote
                });

                toast({
                    title: modalAction === 'approve' ? 'Apontamento Aprovado' : 'Apontamento Rejeitado',
                    description: `O registro da torre ${selectedLog.tower?.objectId} foi processado com sucesso.`,
                });
            }

            setSelectedLog(null);
            setModalAction(null);
            setAuditNote('');
        } catch (error) {
            console.error('Erro no processamento técnico:', error);
            toast({
                title: 'Erro no processamento',
                description: 'Não foi possível salvar a validação técnica.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessingBulk(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === displayLogs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayLogs.map(l => l.id));
        }
    };

    const toggleSelectLog = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const isValidDate = (date: any) => {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d.getTime());
    };

    if (isLoading) {
        return <div className="p-8 text-center animate-pulse italic">Carregando auditorias pendentes...</div>;
    }

    if (displayLogs.length === 0) {
        return (
            <Card className="glass-card border-white/5 border-dashed">
                <CardContent className="p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
                    <h3 className="text-lg font-bold">Tudo em dia!</h3>
                    <p className="text-muted-foreground text-sm">Não há validações técnicas pendentes no momento.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Aguardando Validação Técnica
                    </h3>
                    <p className="text-xs text-muted-foreground">Analise e approve os apontamentos de campo que exigem supervisão.</p>
                </div>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black">
                    {displayLogs.length} PENDENTES
                </Badge>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 rounded-xl border border-white/5 bg-white/2">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-9 text-[10px] font-black uppercase tracking-widest border-white/10 hover:bg-white/5",
                            selectedIds.length > 0 && "border-primary/50 text-primary bg-primary/5"
                        )}
                        onClick={toggleSelectAll}
                    >
                        {selectedIds.length === displayLogs.length && displayLogs.length > 0 ? (
                            <XCircle className="w-3.5 h-3.5 mr-2" />
                        ) : (
                            <CheckSquare className="w-3.5 h-3.5 mr-2" />
                        )}
                        {selectedIds.length === displayLogs.length && displayLogs.length > 0 ? 'Desmarcar' : 'Selecionar Tudo'}
                    </Button>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 text-[10px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                                onClick={() => setModalAction('bulk_approve')}
                            >
                                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                                Aprovar ({selectedIds.length})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 text-[10px] font-black uppercase tracking-widest border-red-500/20 text-red-500 hover:bg-red-500/10"
                                onClick={() => setModalAction('bulk_reject')}
                            >
                                <XCircle className="w-3.5 h-3.5 mr-2" />
                                Rejeitar
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-blue-500/5 px-3 py-2 rounded-lg border border-blue-500/10">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>A aprovação em massa aplicará o protocolo padrão a todos os itens.</span>
                </div>
            </div>

            <Card className="glass-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/5 bg-white/2">
                            <TableHead className="w-[40px] pl-6"></TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest">Torre / Objeto</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest">Atividade</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-center">Progresso</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest">Responsável</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest">Informado em</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest pr-6 text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayLogs.map((log) => (
                             <TableRow 
                                key={log.id} 
                                className={cn(
                                    "hover:bg-white/2 border-white/5 transition-colors",
                                    selectedIds.includes(log.id) && "bg-primary/5 border-primary/20"
                                )}
                            >
                                <TableCell className="pl-6">
                                    <Checkbox 
                                        checked={selectedIds.includes(log.id)}
                                        onCheckedChange={() => toggleSelectLog(log.id)}
                                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-primary/10">
                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <span className="font-bold">{log.tower?.objectId}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold">{log.activity?.name}</span>
                                        <span className="text-[9px] uppercase tracking-tighter opacity-50 italic">
                                            {log.approvalReason || 'Solicitação Padrão'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="text-[10px] font-black border-primary/20 bg-primary/5">
                                        {log.progressPercent}%
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-[10px] font-medium">
                                        <User className="w-3 h-3 opacity-60" />
                                        {log.changedBy?.name?.split(' ')[0]}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-[10px] font-bold">
                                        <span>
                                            {isValidDate(log.createdAt)
                                                ? format(new Date(log.createdAt), 'dd/MM/yyyy')
                                                : 'Data Inválida'}
                                        </span>
                                        <span className="opacity-50">
                                            {isValidDate(log.createdAt)
                                                ? format(new Date(log.createdAt), 'HH:mm')
                                                : '--:--'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500"
                                            onClick={() => {
                                                setSelectedLog(log);
                                                setModalAction('reject');
                                            }}
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 hover:bg-emerald-500/10 hover:text-emerald-500"
                                            onClick={() => {
                                                setSelectedLog(log);
                                                setModalAction('approve');
                                            }}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

             <Dialog open={!!selectedLog || modalAction?.startsWith('bulk_')} onOpenChange={(open) => !open && (setSelectedLog(null), setModalAction(null))}>
                <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {(modalAction === 'approve' || modalAction === 'bulk_approve') ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            {modalAction === 'approve' && 'Confirmar Validação'}
                            {modalAction === 'reject' && 'Rejeitar Apontamento'}
                            {modalAction === 'bulk_approve' && 'Aprovação em Massa'}
                            {modalAction === 'bulk_reject' && 'Rejeição em Massa'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {selectedLog ? (
                                <>Torre: <span className="font-bold text-foreground">{selectedLog?.tower?.objectId}</span> | 
                                Atividade: <span className="font-bold text-foreground">{selectedLog?.activity?.name}</span></>
                            ) : (
                                <>Ação em massa para <span className="font-bold text-foreground">{selectedIds.length}</span> registros selecionados.</>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {selectedLog && (
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest opacity-60">
                                    <span>Progresso Reportado</span>
                                    <span className="text-primary">{selectedLog?.progressPercent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${selectedLog?.progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-1">
                                Notas de Auditoria (Opcional)
                            </label>
                            <Textarea
                                placeholder="Descreva observações técnicas sobre esta validação..."
                                className="glass-card border-white/5 bg-white/2 min-h-[80px] text-xs"
                                value={auditNote}
                                onChange={(e) => setAuditNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-bold uppercase tracking-widest"
                            onClick={() => setSelectedLog(null)}
                        >
                            Cancelar
                        </Button>
                         <Button
                            size="sm"
                            className={(modalAction === 'approve' || modalAction === 'bulk_approve') ? 'gradient-primary' : 'bg-red-500 hover:bg-red-600'}
                            onClick={handleAction}
                            disabled={isApproving || isProcessingBulk}
                        >
                            {(isApproving || isProcessingBulk) ? 'Processando...' : (modalAction === 'approve' || modalAction === 'bulk_approve') ? 'Confirmar Agora' : 'Confirmar Rejeição'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
