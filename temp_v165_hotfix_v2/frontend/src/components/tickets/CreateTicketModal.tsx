import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMessages, TicketType, CreateTicketPayload, SystemMessage } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/database';
import { Loader2, Plus, Ticket, FileText, Users, Wrench, MessageSquare, HelpCircle, Key, Shield, Search, Check, Reply, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/utils/roleUtils';

interface CreateTicketModalProps {
    trigger?: React.ReactNode;
    defaultType?: TicketType;
    replyTo?: SystemMessage; // Para responder mensagens
    onSuccess?: () => void;
}

interface UserOption {
    id: string;
    fullName: string;
    email: string;
    role: string;
    type: 'profile' | 'employee';
}
//    { value: 'PASSWORD_RESET', label: 'Redefinição de Senha', icon: <Key className="w-4 h-4" />, description: 'Solicitar nova senha de acesso' },

const TICKET_TYPES: { value: TicketType; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'DIRECT', label: 'Mensagem Direta', icon: <MessageSquare className="w-4 h-4 text-red-500" />, description: 'Enviar mensagem para um usuário específico' },
    { value: 'ADMINISTRATIVE', label: 'Administrativo', icon: <FileText className="w-4 h-4 text-primary" />, description: 'Solicitações administrativas gerais' },
    { value: 'RH', label: 'Recursos Humanos', icon: <Users className="w-4 h-4 border border-primary rounded-full p-1 text-primary" />, description: 'Questões de RH, folha, benefícios' },
];

const RECIPIENT_ROLES = [
    { value: 'admin', label: 'Administração' },
    { value: 'ti_software', label: 'TI / Software' },
    { value: 'RH', label: 'Recursos Humanos' },
];

// Tipos que não precisam de seleção de destinatário
const AUTO_RECIPIENT_TYPES: TicketType[] = ['PASSWORD_RESET'];

export function CreateTicketModal({ trigger, defaultType, replyTo, onSuccess }: CreateTicketModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { sendMessage } = useMessages();
    const { profile, user } = useAuth();

    // Para busca de usuários
    const [userSearchOpen, setUserSearchOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [users, setUsers] = useState<UserOption[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const [form, setForm] = useState<CreateTicketPayload>({
        type: replyTo ? 'DIRECT' : (defaultType || TICKET_TYPES[0].value),
        subject: replyTo ? `RE: ${replyTo.subject}` : '',
        content: '',
        recipientRole: 'admin',
        recipientId: replyTo?.senderId,
    });

    // Configurar resposta
    useEffect(() => {
        if (replyTo) {
            setForm({
                type: 'DIRECT',
                subject: `RE: ${replyTo.subject}`,
                content: '',
                recipientId: replyTo.senderId,
            });
            // Buscar dados do remetente para preencher selectedUser
            if (replyTo.senderId) {
                fetchUserById(replyTo.senderId);
            }
        }
    }, [replyTo]);

    const fetchUserById = async (userId: string) => {
        const { data: userData } = await (db as any)
            .from('users')
            .select('id, name, email, role')
            .eq('id', userId)
            .maybeSingle();

        if (userData) {
            setSelectedUser({
                id: userData.id,
                fullName: userData.name || '',
                email: userData.email || '',
                role: userData.role || '',
                type: 'profile'
            });
            return;
        }
    };

    // Buscar usuários e funcionários
    const searchUsers = useCallback(async (query: string) => {
        setIsSearching(true);
        try {
            // 1. Buscar Usuários e Funcionários (Unificado em users)
            let usersQuery = (db as any)
                .from('users')
                .select('id, name, email, role');

            if (query) {
                usersQuery = usersQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
            }
            const { data: usersData } = await usersQuery.neq('id', profile?.id).limit(20);

            const results: UserOption[] = [];

            // Mapear perfis
            if (usersData) {
                usersData.forEach((u: any) => {
                    results.push({
                        id: u.id,
                        fullName: u.name || '',
                        email: u.email || '',
                        role: u.role || '',
                        type: 'profile'
                    });
                });
            }

            setUsers(results);
        } catch (e) {
            console.error('Catch error searching users/employees:', e);
        } finally {
            setIsSearching(false);
        }
    }, [profile?.id]);

    // Buscar usuários inicialmente ao abrir a busca ou ao digitar
    useEffect(() => {
        if (!userSearchOpen) return;

        const timer = setTimeout(() => {
            searchUsers(userSearch);
        }, userSearch ? 300 : 0); // Sem delay para busca inicial vazia

        return () => clearTimeout(timer);
    }, [userSearch, userSearchOpen, searchUsers]);

    // Quando o tipo mudar
    useEffect(() => {
        if (AUTO_RECIPIENT_TYPES.includes(form.type)) {
            setForm(prev => ({ ...prev, recipientRole: 'gestao', recipientId: undefined }));
            setSelectedUser(null);
        }
        if (form.type !== 'DIRECT') {
            setSelectedUser(null);
            setForm(prev => ({ ...prev, recipientId: undefined }));
        }
    }, [form.type]);

    const handleSelectUser = (userOption: UserOption) => {
        setSelectedUser(userOption);
        setForm(prev => ({ ...prev, recipientId: userOption.id }));
        setUserSearchOpen(false);
        setUserSearch('');
    };

    const resetForm = useCallback(() => {
        setForm({
            type: replyTo ? 'DIRECT' : (defaultType || TICKET_TYPES[0].value),
            subject: replyTo ? `RE: ${replyTo.subject}` : '',
            content: '',
            recipientRole: 'admin',
            recipientId: replyTo?.senderId,
        });
        setSelectedUser(null);
        setUserSearch('');
        setUsers([]);

        // Se for resposta, buscar o usuário novamente para o cache de seleção
        if (replyTo?.senderId) {
            fetchUserById(replyTo.senderId);
        }
    }, [defaultType, replyTo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Determinar destinatário
        let recipientRole = form.recipientRole;
        let recipientId = form.recipientId;
        let recipientIdEmployee = undefined;

        if (AUTO_RECIPIENT_TYPES.includes(form.type)) {
            recipientRole = 'gestao';
        } else if (form.type === 'DIRECT' && selectedUser) {
            if (selectedUser.type === 'employee') {
                recipientIdEmployee = selectedUser.id;
                recipientId = undefined;
            } else {
                recipientId = selectedUser.id;
            }
            recipientRole = undefined;
        }

        const result = await sendMessage({
            ...form,
            recipientRole,
            recipientId,
            recipientIdEmployee,
            companyId: profile?.companyId,
            projectId: profile?.projectId,
            siteId: profile?.siteId,
            metadata: {
                createdFrom: replyTo ? 'reply' : 'ticket_modal',
                userRole: profile?.role,
                userName: profile?.fullName,
                replyToId: replyTo?.id,
                recipientType: selectedUser?.type
            }
        });

        setIsLoading(false);

        if (result.success) {
            setOpen(false);
            resetForm();
            onSuccess?.();
        }
    };

    const selectedType = TICKET_TYPES.find(t => t.value === form.type);
    const isAutoRecipient = AUTO_RECIPIENT_TYPES.includes(form.type);
    const isDirectMessage = form.type === 'DIRECT';


    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gradient-primary">
                        {replyTo ? (
                            <>
                                <Reply className="w-4 h-4 mr-2" />
                                Responder
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Ticket
                            </>
                        )}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {replyTo ? <Reply className="w-5 h-5 text-primary" /> : <Ticket className="w-5 h-5 text-primary" />}
                        {replyTo ? 'Responder Mensagem' : 'Criar Novo Ticket'}
                    </DialogTitle>
                    <DialogDescription>
                        {replyTo
                            ? `Respondendo a: ${replyTo.sender?.full_name || replyTo.senderEmail}`
                            : 'Preencha os campos abaixo para abrir uma solicitação formal.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    {/* Tipo de Ticket - Desabilitado se for resposta */}
                    {!replyTo && (
                        <div className="space-y-2">
                            <Label>Tipo de Ticket *</Label>
                            <Select
                                value={form.type}
                                onValueChange={(value: TicketType) => setForm({ ...form, type: value })}
                            >
                                <SelectTrigger className="industrial-input">
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TICKET_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                {type.icon}
                                                <span>{type.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedType && (
                                <p className="text-xs text-muted-foreground">{selectedType.description}</p>
                            )}
                        </div>
                    )}

                    {/* Destinatário */}
                    {isAutoRecipient ? (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <Shield className="w-4 h-4 text-primary" />
                                <span className="font-light">Encaminhamento automático</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Este tipo de solicitação será enviado para a <Badge variant="outline" className="ml-1">Gestão</Badge>
                            </p>
                        </div>
                    ) : isDirectMessage || replyTo ? (
                        // Autocomplete de usuários para mensagem direta
                        <div className="space-y-2">
                            <Label>Destinatário *</Label>
                            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={userSearchOpen}
                                        className="w-full justify-between industrial-input h-10"
                                        disabled={!!replyTo}
                                    >
                                        {selectedUser ? (
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span>{selectedUser.fullName}</span>
                                                <span className="text-xs text-muted-foreground">({selectedUser.email})</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Buscar usuário...</span>
                                        )}
                                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Digite nome ou email..."
                                            value={userSearch}
                                            onValueChange={setUserSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                {isSearching ? 'Buscando...' : 'Nenhum usuário encontrado.'}
                                            </CommandEmpty>
                                            <CommandGroup heading="Usuários">
                                                {users.map((u) => (
                                                    <CommandItem
                                                        key={u.id}
                                                        value={u.id}
                                                        onSelect={() => handleSelectUser(u)}
                                                        className="cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <User className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium truncate">{u.fullName}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{u.email || 'Sem e-mail'}</p>
                                                            </div>
                                                            <Badge
                                                                variant={u.type === 'employee' ? "secondary" : "outline"}
                                                                className={cn(
                                                                    "text-[10px]",
                                                                    u.type === 'employee' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                                )}
                                                            >
                                                                {u.type === 'employee' ? 'Equipe' : getRoleLabel(u.role)}
                                                            </Badge>
                                                        </div>
                                                        <Check
                                                            className={cn(
                                                                "ml-auto h-4 w-4",
                                                                selectedUser?.id === u.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedUser && (
                                <p className="text-xs text-muted-foreground">
                                    Mensagem será enviada diretamente para {selectedUser.fullName}
                                </p>
                            )}
                        </div>
                    ) : (
                        // Seleção de role
                        <div className="space-y-2">
                            <Label>Encaminhar para *</Label>
                            <Select
                                value={form.recipientRole}
                                onValueChange={(value) => setForm({ ...form, recipientRole: value })}
                            >
                                <SelectTrigger className="industrial-input">
                                    <SelectValue placeholder="Selecione o destinatário" />
                                </SelectTrigger>
                                <SelectContent>
                                    {RECIPIENT_ROLES.map(role => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Assunto */}
                    <div className="space-y-2">
                        <Label htmlFor="ticket-subject">Assunto *</Label>
                        <Input
                            id="ticket-subject"
                            value={form.subject}
                            onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            placeholder="Resumo da solicitação"
                            className="industrial-input"
                            required
                        />
                    </div>

                    {/* Mensagem */}
                    <div className="space-y-2">
                        <Label htmlFor="ticket-content">Mensagem *</Label>
                        <Textarea
                            id="ticket-content"
                            value={form.content}
                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                            placeholder="Descreva detalhadamente sua solicitação..."
                            className="industrial-input min-h-[120px]"
                            required
                        />
                    </div>

                    {/* Escopo (informativo) - Só para tickets novos */}
                    {!replyTo && (
                        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                            <p className="font-semibold mb-1">Escopo do ticket:</p>
                            <p>Empresa: {profile?.companyId ? '✓ Vinculado' : 'N/A'}</p>
                            <p>Obra: {profile?.projectId ? '✓ Vinculado' : 'N/A'}</p>
                            <p>Canteiro: {profile?.siteId ? '✓ Vinculado' : 'N/A'}</p>
                        </div>
                    )}

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => {
                            setOpen(false);
                            resetForm();
                        }}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="gradient-primary"
                            disabled={isLoading || !form.subject || !form.content || (isDirectMessage && !selectedUser && !replyTo)}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : replyTo ? <Reply className="w-4 h-4 mr-2" /> : <Ticket className="w-4 h-4 mr-2" />}
                            {replyTo ? 'Enviar Resposta' : 'Enviar Ticket'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


