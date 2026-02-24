import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orionApi } from '@/integrations/orion/client';

export interface ProductionLog {
    id: string;
    towerId: string;
    activityId: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    progressPercent: number;
    comment?: string;
    requiresApproval: boolean;
    approvalReason?: string;
    createdAt: string;
    timestamp?: string; // Fundamental para aprovação no histórico JSON
    progressId?: string; // Alias para id do registro de progresso
    tower?: { objectId: string };
    activity?: { name: string };
    changedBy?: { name: string; email: string };
    approvedBy?: { name: string };
}

export function useProductionLogs(pendingOnly = false) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['production_logs', { pendingOnly }],
        queryFn: async () => {
            const response = await orionApi.get<ProductionLog[]>('/production/logs', {
                pendingOnly: String(pendingOnly)
            });
            if (response.error) throw new Error(response.error.message);
            return response.data || [];
        }
    });

    const approveMutation = useMutation({
        mutationFn: async ({ progressId, logTimestamp }: { progressId: string; logTimestamp: string }) => {
            const response = await orionApi.post('/production/logs', {
                progressId,
                logTimestamp
            });
            if (response.error) throw new Error(response.error.message);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['production_logs'] });
            queryClient.invalidateQueries({ queryKey: ['audit_stats'] }); // For counter
        }
    });

    return {
        ...query,
        approve: approveMutation.mutateAsync,
        isApproving: approveMutation.isPending
    };
}
