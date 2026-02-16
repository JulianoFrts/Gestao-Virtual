import React, { useMemo } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, User, Calendar, Database } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatNameForLGPD } from '@/lib/utils';

interface GAPOAuditDashboardProps {
    projectId?: string;
    siteId?: string;
}

export default function GAPOAuditDashboard({ projectId, siteId }: GAPOAuditDashboardProps) {
    const { data: logs = [], isLoading, progress } = useAuditLogs();

    // Filter logs for operational tables only and by project/site context
    const operationalLogs = useMemo(() => {
        const opTables = ['work_stages', 'stage_progress', 'construction_documents', 'teams', 'sites', 'projects'];

        return logs.filter(log => {
            const isOp = opTables.includes(log.table_name);
            // If we had project_id/site_id directly in audit_logs, we'd filter here.
            // For now, we assume the backend filters globally or we rely on 'details' having IDs if needed.
            // Since backend strictly enforces multitenancy now, this is safer.
            // However, for extra client-side filtering if metadata implies project:
            // const matchesProject = !projectId || log.metadata?.projectId === projectId;
            return isOp;
        }).slice(0, 50);
    }, [logs, projectId]);

    const getActionStyle = (action: string) => {
        switch (action) {
            case 'INSERT': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'UPDATE': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'DELETE': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    return (
        <Card className="glass-card relative overflow-hidden">
            {isLoading && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 z-10">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            <CardHeader className="border-b border-white/5">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Trilha de Auditoria Operacional
                    </div>
                    {isLoading && (
                        <span className="text-[10px] font-mono text-primary animate-pulse">
                            SINCRONIZANDO: {progress}%
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/5 bg-white/2">
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest pl-6">Evento</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest">Responsável</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest">Módulo</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest">Ação</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest pr-6">Data</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && operationalLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <Activity className="w-6 h-6 text-primary animate-spin" />
                                        <span className="text-xs text-muted-foreground">Iniciando conexão segura...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : operationalLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 italic text-muted-foreground">Nenhum evento operacional registrado.</TableCell>
                            </TableRow>
                        ) : (
                            operationalLogs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-white/2 border-white/5 transition-colors">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Database className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-sm font-bold">ID: {log.record_id.substring(0, 8)}...</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs font-medium">
                                            <User className="w-3 h-3 text-primary" />
                                            {formatNameForLGPD(log.performer_name)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[9px] uppercase font-black bg-white/5">
                                            {log.table_name}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getActionStyle(log.action) + " text-[9px] font-black uppercase"}>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 whitespace-nowrap">
                                        <div className="flex flex-col text-[10px] font-bold">
                                            {log.performed_at && !isNaN(new Date(log.performed_at).getTime()) ? (
                                                <>
                                                    <span>{format(new Date(log.performed_at), 'dd/MM/yyyy')}</span>
                                                    <span className="opacity-50">{format(new Date(log.performed_at), 'HH:mm:ss')}</span>
                                                </>
                                            ) : (
                                                <span>--</span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
