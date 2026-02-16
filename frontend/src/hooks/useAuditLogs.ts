import { useEffect } from 'react';
import { AuditLog, auditLogs, isLoadingAudit, fetchAuditLogs, auditProgress, totalAuditLogs } from '@/signals/auditSignals';
export type { AuditLog };

export function useAuditLogs(companyId?: string) {
    useEffect(() => {
        fetchAuditLogs();
    }, []);

    return {
        data: auditLogs.value,
        isLoading: isLoadingAudit.value,
        progress: auditProgress.value,
        total: totalAuditLogs.value,
        refetch: fetchAuditLogs
    };
}


