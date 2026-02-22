import { signal } from "@preact/signals-react";
import { db, orionApi } from "@/integrations/database";
import { type SystemMessage } from "@/hooks/useMessages";
import { storageService } from "@/services/storageService";

export const systemMessagesSignal = signal<SystemMessage[]>([]);
export const isSystemMessagesLoadingSignal = signal(false);
export const hasSystemMessagesFetchedSignal = signal(false);

export const fetchSystemMessages = async (force = false) => {
    // Evita refetch desnecessário ou sem token (Auth inicial)
    const token = orionApi.token;
    if (!token) return;

    if (!force && hasSystemMessagesFetchedSignal.value && systemMessagesSignal.value.length > 0) {
        return;
    }

    isSystemMessagesLoadingSignal.value = true;

    try {
        if (!navigator.onLine) {
            const cached = await storageService.getItem<SystemMessage[]>("system_messages");
            if (cached) {
                systemMessagesSignal.value = cached;
                hasSystemMessagesFetchedSignal.value = true;
            }
            return;
        }

        // 1. Fetch Messages
        const { data: msgsData, error: msgsError } = await (db as any)
            .from("system_messages")
            .select("*")
            .order("created_at", { ascending: false });

        if (msgsError) throw msgsError;

        if (!msgsData || msgsData.length === 0) {
            systemMessagesSignal.value = [];
            hasSystemMessagesFetchedSignal.value = true;
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
            type: msg.type as any,
            subject: msg.subject,
            content: msg.content,
            attachmentUrl: msg.attachment_url,
            status: msg.status as any,
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

        systemMessagesSignal.value = finalMessages;
        hasSystemMessagesFetchedSignal.value = true;

        // Cache in background
        storageService.setItem("system_messages", finalMessages).catch(console.error);

    } catch (error: any) {
        console.error("[fetchSystemMessages] Error:", error);
        // Fallback to cache
        const cached = await storageService.getItem<SystemMessage[]>("system_messages");
        if (cached) {
            systemMessagesSignal.value = cached;
        }
    } finally {
        hasSystemMessagesFetchedSignal.value = true;
        isSystemMessagesLoadingSignal.value = false;
        console.log("[fetchSystemMessages] Finished. Signal set to true.");
    }
};
