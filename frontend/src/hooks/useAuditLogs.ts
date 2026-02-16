import { useEffect } from 'react';
import { AuditLog, auditLogs, isLoadingAudit, fetchAuditLogs, auditProgress, totalAuditLogs } from '@/signals/auditSignals';
import { currentUserSignal } from '@/signals/authSignals';

export type { AuditLog };

export function useAuditLogs(companyId?: string) {
    useEffect(() => {
        if (currentUserSignal.value) {
            fetchAuditLogs();
        }
    }, []);


    return {
        data: auditLogs.value,
        isLoading: isLoadingAudit.value,
        progress: auditProgress.value,
        total: totalAuditLogs.value,
        refetch: fetchAuditLogs
    };
}


