import { useState, useEffect, useCallback } from 'react';
import { db } from "@/integrations/database";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { storageService } from "@/services/storageService";
import { isGestaoGlobal } from "@/utils/permissionHelpers";

// Tipos de Ticket
export type TicketType =
  | "PASSWORD_RESET"
  | "ADMINISTRATIVE"
  | "RH"
  | "OPERATIONAL"
  | "DIRECT"
  | "OTHER";

// Status do Ticket
export type TicketStatus =
  | "PENDING"
  | "IN_ANALYSIS"
  | "AWAITING_RESPONSE"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

export interface SystemMessage {
  id: string;
  senderId?: string;
  senderEmail?: string;
  recipientRole?: string;
  recipientId?: string;
  companyId?: string;
  projectId?: string;
  siteId?: string;
  type: TicketType;
  subject: string;
  content: string;
  attachmentUrl?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
  sender?: {
    full_name: string;
    email: string;
  };
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  performedBy?: string;
  comment?: string;
  createdAt: string;
}

export interface CreateTicketPayload {
  type: TicketType;
  subject: string;
  content: string;
  recipientRole?: string;
  recipientId?: string;
  recipientIdEmployee?: string;
  companyId?: string;
  projectId?: string;
  siteId?: string;
  attachmentUrl?: string;
  senderEmail?: string; // Para solicitações anônimas
  metadata?: Record<string, any>;
}

export function useMessages() {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (!navigator.onLine) {
        const cached = await storageService.getItem<SystemMessage[]>("system_messages");
        if (cached) setMessages(cached);
        return;
      }

      // 1. Fetch Messages
      const { data: msgsData, error: msgsError } = await (db as any)
        .from("system_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (msgsError) throw msgsError;

      if (!msgsData || msgsData.length === 0) {
        setMessages([]);
        return;
      }

      // 2. Extrair IDs de remetentes (podem ser perfis ou funcionários)
      const senderIds = Array.from(
        new Set(msgsData.map((m: any) => m.sender_id).filter(Boolean)),
      ) as string[];

      // 3. Buscar Perfis e Funcionários para Remetentes
      const namesMap: Record<string, any> = {};

      if (senderIds.length > 0) {
        const { data: usersData } = await (db as any)
          .from("users")
          .select("id, name, full_name, email")
          .in("id", senderIds);

        if (usersData) {
          usersData.forEach((p: any) => {
            namesMap[p.id] = {
              id: p.id,
              full_name: p.name || p.full_name,
              email: p.email,
            };
          });
        }
      }

      // 4. Merge Data
      const finalMessages = msgsData.map((msg: any) => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderEmail: msg.sender_email,
        recipientRole: msg.recipient_role,
        recipientId: msg.recipient_id || msg.recipient_id_employee,
        companyId: msg.company_id,
        projectId: msg.project_id,
        siteId: msg.site_id,
        type: msg.type,
        subject: msg.subject,
        content: msg.content,
        attachmentUrl: msg.attachment_url,
        status: msg.status,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
        resolvedBy: msg.resolved_by,
        resolvedAt: msg.resolved_at,
        metadata: msg.metadata,
        sender: namesMap[msg.sender_id] || {
          full_name: "Desconhecido",
          email: msg.sender_email || "",
        },
      }));

      setMessages(finalMessages);
      await storageService.setItem("system_messages", finalMessages);
    } catch (error: any) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        toast({
          title: "Tabela não encontrada",
          description: "Execute o SQL do schema de tickets no db.",
          variant: "destructive",
        });
      } else {
          // Silent fallback for network errors
          const cached = await storageService.getItem<SystemMessage[]>("system_messages");
          if (cached) setMessages(cached);
          console.warn("[useMessages] Network error, using local cache.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [profile, toast]);

  const sendMessage = async (payload: CreateTicketPayload) => {
    try {
      const insertData: any = {
        sender_id: profile?.id,
        sender_email: payload.senderEmail || user?.email,
        recipient_role: payload.recipientRole,
        recipient_id: payload.recipientId,
        recipient_id_employee: payload.recipientIdEmployee,
        company_id: payload.companyId || profile?.companyId,
        project_id: payload.projectId || profile?.projectId,
        site_id: payload.siteId || profile?.siteId,
        type: payload.type,
        subject: payload.subject,
        content: payload.content,
        attachment_url: payload.attachmentUrl,
        status: "PENDING",
        metadata: payload.metadata || {},
      };

      const { error } = await (db as any)
        .from("system_messages")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Ticket criado",
        description: "Sua solicitação foi registrada com sucesso.",
      });
      fetchMessages();
      return { success: true };
    } catch (error: any) {
      console.error("Send Error:", error);
      toast({
        title: "Erro ao criar ticket",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const updateMessageStatus = async (
    id: string,
    status: TicketStatus,
    comment?: string,
  ) => {
    try {
      const updateData: any = { status };

      // Se aprovado ou rejeitado, registrar quem resolveu
      if (
        status === "APPROVED" ||
        status === "REJECTED" ||
        status === "CLOSED"
      ) {
        updateData.resolved_by = profile?.id;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await (db as any)
        .from("system_messages")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Registrar no histórico
      await (db as any).from("ticket_history").insert({
        ticket_id: id,
        action: "status_changed",
        old_status: messages.find((m) => m.id === id)?.status,
        new_status: status,
        performed_by: profile?.id,
        comment: comment,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m)),
      );
      toast({
        title: "Status atualizado",
        description: `Ticket marcado como ${status}`,
      });
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
      return { success: false };
    }
  };

  // Aprovar solicitação de redefinição de senha
  const approvePasswordReset = async (
    ticketId: string,
    targetUserId: string,
  ) => {
    try {
      // 1. Buscar o ticket para obter o e-mail do remetente
      const ticket = messages.find((m) => m.id === ticketId);
      const userEmail = ticket?.senderEmail || ticket?.sender?.email;

      // 2. Atualizar status do ticket
      await updateMessageStatus(
        ticketId,
        "APPROVED",
        "Redefinição de senha autorizada e e-mail enviado.",
      );

      // 3. Criar permissão temporária (12 horas)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);

      const { error: permError } = await (db as any)
        .from("temporary_permissions")
        .insert({
          user_id: targetUserId,
          permission_type: "password_change",
          granted_by: profile?.id,
          ticket_id: ticketId,
          expires_at: expiresAt.toISOString(),
        });

      if (permError) throw permError;

      // 4. Enviar e-mail de recuperação do db se o e-mail estiver disponível
      if (userEmail) {
        const { error: resetError } = await db.auth.resetPasswordForEmail(
          userEmail,
          {
            redirectTo: `${window.location.origin}/auth?mode=reset`,
          },
        );

        if (resetError) {
          console.warn("Erro ao enviar e-mail de reset:", resetError);
          toast({
            title: "Aviso",
            description:
              "Ticket aprovado, mas houve um problema ao disparar o e-mail automático.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "E-mail enviado",
            description: `Um e-mail de redefinição foi enviado para ${userEmail}.`,
          });
        }
      }

      toast({
        title: "Redefinição autorizada",
        description:
          "Acesso liberado para alteração de senha nas próximas 12 horas.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return { success: false };
    }
  };

  // Verificar se o usuário tem permissão para alterar senha
  const checkPasswordPermission = async (): Promise<boolean> => {
    if (!profile?.id) return false;

    // SuperAdmin sempre pode
    if (isGestaoGlobal(profile || undefined)) return true;

    try {
      const { data, error } = await (db as any)
        .from("temporary_permissions")
        .select("id")
        .eq("user_id", profile.id)
        .eq("permission_type", "password_change")
        .gt("expires_at", new Date().toISOString())
        .is("used_at", null)
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch {
      return false;
    }
  };

  // Marcar permissão como usada
  const consumePasswordPermission = async () => {
    try {
      await (db as any)
        .from("temporary_permissions")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", profile?.id)
        .eq("permission_type", "password_change")
        .is("used_at", null);
    } catch (error) {
      console.error("Error marking permission as used:", error);
    }
  };

  // Buscar histórico de um ticket
  const fetchTicketHistory = async (
    ticketId: string,
  ): Promise<TicketHistory[]> => {
    try {
      const { data, error } = await (db as any)
        .from("ticket_history")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((h: any) => ({
        id: h.id,
        ticketId: h.ticket_id,
        action: h.action,
        oldStatus: h.old_status,
        newStatus: h.new_status,
        performedBy: h.performed_by,
        comment: h.comment,
        createdAt: h.created_at,
      }));
    } catch {
      return [];
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    sendMessage,
    updateMessageStatus,
    approvePasswordReset,
    checkPasswordPermission,
    consumePasswordPermission,
    fetchTicketHistory,
    refresh: fetchMessages,
  };
}


