import { useEffect } from 'react';
import { AuditLog, auditLogs, isLoadingAudit, fetchAuditLogs } from '@/signals/auditSignals';
export type { AuditLog };

export function useAuditLogs(companyId?: string) {
    useEffect(() => {
        fetchAuditLogs();
    }, []);

    return {
        data: auditLogs.value,
        isLoading: isLoadingAudit.value,
        refetch: fetchAuditLogs
    };
}


