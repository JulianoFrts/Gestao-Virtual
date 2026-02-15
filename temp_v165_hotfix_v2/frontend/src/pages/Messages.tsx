import React, { useState } from 'react';
import { useMessages, SystemMessage, TicketStatus, TicketType } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
    Mail, Send, Inbox, Search, CheckCircle2, XCircle, Clock,
    Ticket, FileText, Users, Wrench, MessageSquare, HelpCircle,
    Eye, AlertCircle, Archive, RotateCcw, Reply
} from 'lucide-react';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import { isProtectedSignal, can } from '@/signals/authSignals';

// Mapeamento de tipos para ícones e labels
const TYPE_CONFIG: Record<TicketType, { icon: React.ReactNode; label: string; color: string }> = {
    'PASSWORD_RESET': { icon: <Clock className="w-4 h-4" />, label: 'Senha', color: 'text-yellow-500 uppercase' },
    'ADMINISTRATIVE': { icon: <FileText className="w-4 h-4" />, label: 'Admin', color: 'text-blue-500 uppercase' },
    'RH': { icon: <Users className="w-4 h-4" />, label: 'RH', color: 'text-purple-500 uppercase' },
    'OPERATIONAL': { icon: <Wrench className="w-4 h-4" />, label: 'Operacional', color: 'text-orange-500 uppercase' },
    'DIRECT': { icon: <MessageSquare className="w-4 h-4" />, label: 'Direto', color: 'text-green-500 uppercase' },
    'OTHER': { icon: <HelpCircle className="w-4 h-4" />, label: 'Outro', color: 'text-gray-500 uppercase' },
};

// Mapeamento de status para badges
const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: 'default' | 'outline'; className: string }> = {
    'PENDING': { label: 'Pendente', variant: 'outline', className: 'text-yellow-500 uppercase border-yellow-500' },
    'IN_ANALYSIS': { label: 'Em Análise', variant: 'outline', className: 'text-blue-500 uppercase border-blue-500' },
    'AWAITING_RESPONSE': { label: 'Aguardando', variant: 'outline', className: 'text-orange-500 uppercase border-orange-500' },
    'APPROVED': { label: 'Aprovado', variant: 'outline', className: 'text-green-500 uppercase border-green-500' },
    'REJECTED': { label: 'Rejeitado', variant: 'outline', className: 'text-red-500 uppercase border-red-500' },
    'CLOSED': { label: 'Finalizado', variant: 'outline', className: 'text-gray-500 uppercase border-gray-500' },
};

export default function Messages() {
    const { messages, isLoading, updateMessageStatus, approvePasswordReset, refresh } = useMessages();
    const { profile, user } = useAuth();
    const [search, setSearch] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<SystemMessage | null>(null);
    const [activeTab, setActiveTab] = useState('inbox');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Verificar se é SuperAdmin ou Role Corporativa
    // Verificações via Signals
    const isSuperAdmin = isProtectedSignal.value;
    const isAdmin = isProtectedSignal.value || can('system.is_corporate');

    // Filter messages
    const filteredMessages = messages.filter(msg => {
        // Filtro de busca
        const matchesSearch = msg.subject.toLowerCase().includes(search.toLowerCase()) ||
            msg.content.toLowerCase().includes(search.toLowerCase()) ||
            (msg.senderEmail || '').toLowerCase().includes(search.toLowerCase());

        // Filtro de tipo
        const matchesType = typeFilter === 'all' || msg.type === typeFilter;

        // Filtro de status
        const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;

        // Lógica de Inbox: não mostrar mensagens enviadas por mim
        // Roles que podem ver/aprovar PASSWORD_RESET: admin, ti_software, gestor_project, rh
        const canSeePasswordReset = isAdmin || can('messages.approve_password');

        const isInbox = activeTab === 'inbox' &&
            msg.senderId !== profile?.id &&
            msg.senderEmail !== user?.email && (
                msg.recipientId === profile?.id ||
                msg.recipientRole === profile?.role ||
                msg.recipientRole === 'gestao' && canSeePasswordReset || // Gestão = admin, gestor_project, rh
                (isAdmin && (msg.recipientRole === 'ADMIN' || msg.type === 'PASSWORD_RESET')) ||
                (canSeePasswordReset && msg.type === 'PASSWORD_RESET') ||
                isSuperAdmin
            );

        // Lógica de Enviados
        const isSent = activeTab === 'sent' && (
            msg.senderId === profile?.id ||
            msg.senderEmail === user?.email
        );

        return matchesSearch && matchesType && matchesStatus && (isInbox || isSent);
    });

    const handleViewMessage = async (msg: SystemMessage) => {
        setSelectedMessage(msg);
        // Marcar como "Em Análise" se estiver pendente e for caixa de entrada
        if (msg.status === 'PENDING' && activeTab === 'inbox') {
            await updateMessageStatus(msg.id, 'IN_ANALYSIS');
            refresh();
        }
    };

    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!selectedMessage) return;

        // Se for aprovação de reset de senha, usar fluxo especial
        if (selectedMessage.type === 'PASSWORD_RESET' && newStatus === 'APPROVED') {
            const targetUserId = selectedMessage.senderId || selectedMessage.metadata?.userId;
            if (targetUserId) {
                await approvePasswordReset(selectedMessage.id, targetUserId);
            } else {
                await updateMessageStatus(selectedMessage.id, newStatus);
            }
        } else {
            await updateMessageStatus(selectedMessage.id, newStatus);
        }

        refresh();
        setSelectedMessage(null);
    };

    const getStatusBadge = (status: TicketStatus) => {
        const config = STATUS_CONFIG[status] || { label: status, variant: 'outline' as const, className: '' };
        return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
    };

    const getTypeBadge = (type: TicketType) => {
        const config = TYPE_CONFIG[type] || TYPE_CONFIG['OTHER'];
        return (
            <div className={`flex items-center gap-1 ${config.color}`}>
                {config.icon}
                <span className="text-xs">{config.label}</span>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in p-4 pb-20 md:pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display uppercase tracking-wider flex items-center gap-2">
                        <Ticket className="w-6 h-6 text-primary" />
                        Central de Tickets
                    </h1>
                    <p className="text-muted-foreground">Gerencie solicitações e comunicações formais.</p>
                </div>
                <CreateTicketModal onSuccess={refresh} />
            </div>

            <Card className="glass-card">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                            <TabsList className="grid w-full grid-cols-2 md:w-auto">
                                <TabsTrigger value="inbox" className="gap-2"><Inbox className="w-4 h-4" /> Caixa de Entrada</TabsTrigger>
                                <TabsTrigger value="sent" className="gap-2"><Send className="w-4 h-4" /> Enviados</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            {/* Filtro de Tipo */}
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[130px] h-9">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Tipos</SelectItem>
                                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className="flex items-center gap-2">
                                                {config.icon}
                                                {config.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Filtro de Status */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[130px] h-9">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Status</SelectItem>
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Busca */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 h-9 industrial-input"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[80px]">Tipo</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead>Assunto</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        {activeTab === 'inbox' ? 'Remetente' : 'Destinatário'}
                                    </TableHead>
                                    <TableHead className="text-right w-[100px]">Data</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Carregando tickets...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredMessages.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Nenhum ticket encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMessages.map((msg) => (
                                        <TableRow
                                            key={msg.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => handleViewMessage(msg)}
                                        >
                                            <TableCell>{getTypeBadge(msg.type)}</TableCell>
                                            <TableCell>{getStatusBadge(msg.status)}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[300px]">{msg.subject}</span>
                                                    <span className="text-xs text-muted-foreground md:hidden truncate max-w-[200px]">
                                                        {msg.content.substring(0, 50)}...
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {msg.sender?.full_name || msg.senderEmail || 'Sistema'}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {new Date(msg.createdAt).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Ticket Detail Dialog */}
            <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedMessage && getTypeBadge(selectedMessage.type)}
                            <span className="truncate">{selectedMessage?.subject}</span>
                        </DialogTitle>
                        <DialogDescription className="flex flex-wrap items-center gap-2 pt-2">
                            <span>De: {selectedMessage?.sender?.full_name || selectedMessage?.senderEmail || 'Anônimo'}</span>
                            <span>•</span>
                            <span>{selectedMessage && new Date(selectedMessage.createdAt).toLocaleString('pt-BR')}</span>
                            <span>•</span>
                            {selectedMessage && getStatusBadge(selectedMessage.status)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-4 p-4 bg-muted/30 rounded-lg border border-border/50 min-h-[100px] whitespace-pre-wrap text-sm">
                        {selectedMessage?.content}
                    </div>

                    {selectedMessage?.metadata && Object.keys(selectedMessage.metadata).length > 0 && (
                        <div className="mb-4 text-xs text-muted-foreground border-t pt-3">
                            <p className="font-semibold mb-2">Informações Adicionais:</p>
                            <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2 rounded">
                                {Object.entries(selectedMessage.metadata).map(([key, value]) => (
                                    <div key={key}>
                                        <span className="font-medium">{key}:</span> {String(value)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                                Fechar
                            </Button>
                            {/* Botão Responder - Apenas para mensagens recebidas na Inbox */}
                            {activeTab === 'inbox' && selectedMessage && selectedMessage.senderId && (
                                <CreateTicketModal
                                    replyTo={selectedMessage}
                                    onSuccess={() => {
                                        setSelectedMessage(null);
                                        refresh();
                                    }}
                                    trigger={
                                        <Button variant="secondary" className="gap-2">
                                            <Reply className="w-4 h-4" />
                                            Responder
                                        </Button>
                                    }
                                />
                            )}
                        </div>

                        {/* Ações de Gestão - Admin, Gestor de Obra, RH podem aprovar PASSWORD_RESET */}
                        {(() => {
                            const canApprove = isAdmin || (selectedMessage?.type === 'PASSWORD_RESET' && can('messages.approve_password'));

                            return canApprove && activeTab === 'inbox' && selectedMessage &&
                                selectedMessage.status !== 'APPROVED' &&
                                selectedMessage.status !== 'REJECTED' &&
                                selectedMessage.status !== 'CLOSED' && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMessage.status === 'PENDING' && (
                                            <Button
                                                variant="outline"
                                                onClick={() => handleStatusChange('IN_ANALYSIS')}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Em Análise
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            onClick={() => handleStatusChange('AWAITING_RESPONSE')}
                                        >
                                            <AlertCircle className="w-4 h-4 mr-2" />
                                            Aguardar
                                        </Button>

                                        <Button
                                            variant="destructive"
                                            onClick={() => handleStatusChange('REJECTED')}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Rejeitar
                                        </Button>

                                        <Button
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleStatusChange('APPROVED')}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Aprovar
                                        </Button>
                                    </div>
                                )
                        })()}

                        {/* Ação de Finalizar (para tickets já aprovados/rejeitados) */}
                        {isAdmin && (selectedMessage?.status === 'APPROVED' || selectedMessage?.status === 'REJECTED') && (
                            <Button
                                variant="outline"
                                onClick={() => handleStatusChange('CLOSED')}
                            >
                                <Archive className="w-4 h-4 mr-2" />
                                Arquivar/Finalizar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
