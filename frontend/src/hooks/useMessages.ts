import { useCallback } from 'react';
import { db } from "@/integrations/database";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  systemMessagesSignal,
  isSystemMessagesLoadingSignal,
  fetchSystemMessages,
  hasSystemMessagesFetchedSignal
} from '@/signals/monitoringSignals';

// Tipos de Ticket (Mantidos para compatibilidade)
export type TicketType =
  | "PASSWORD_RESET"
  | "ADMINISTRATIVE"
  | "RH"
  | "OPERATIONAL"
  | "DIRECT"
  | "OTHER";

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
  const messages = systemMessagesSignal.value;
  const isLoading = isSystemMessagesLoadingSignal.value;

  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Mantido para compatibilidade, agora chama a função centralizada
  const refresh = useCallback(async () => {
    await fetchSystemMessages(true);
  }, []);

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
      refresh(); // Atualiza signal
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

      // Atualiza localmente o signal para feedback instantâneo
      systemMessagesSignal.value = systemMessagesSignal.value.map((m) =>
        m.id === id ? { ...m, status } : m
      );

      toast({
        title: "Status atualizado",
        description: `Ticket marcado como ${status} `,
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

  const approvePasswordReset = async (
    ticketId: string,
    targetUserId: string,
  ) => {
    try {
      const ticket = messages.find((m) => m.id === ticketId);
      const userEmail = ticket?.senderEmail || ticket?.sender?.email;

      await updateMessageStatus(
        ticketId,
        "APPROVED",
        "Redefinição de senha autorizada e e-mail enviado.",
      );

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

  const checkPasswordPermission = async (): Promise<boolean> => {
    // ... mantido ...
    if (!profile?.id) return false;
    // ... simplificando implementação anterior mantendo lógica ...
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

  // Mantido igual
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

  const fetchTicketHistory = async (ticketId: string): Promise<TicketHistory[]> => {
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

  // Nao chamamos fetchSystemMessages() no mount aqui para evitar chamada dupla se o Loader ja chamou.
  // Porem, se o componente for montado isoladamente e não tiver dados, ele deve chamar?
  // Sim.
  if (messages.length === 0 && !isLoading && !hasSystemMessagesFetchedSignal.value) {
    // Disparar fetch em background se ainda não foi feito
    fetchSystemMessages().catch(console.error);
  }

  return {
    messages,
    isLoading,
    sendMessage,
    updateMessageStatus,
    approvePasswordReset,
    checkPasswordPermission,
    consumePasswordPermission,
    fetchTicketHistory,
    refresh,
  };
}


