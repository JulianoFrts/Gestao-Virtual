import { AuditLogRepository } from "../domain/audit-log.repository";

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  async listLogs(params: {
    limit: number;
    skip?: number;
    isGlobalAccess: boolean;
    companyId?: string;
  }) {
    const { limit, skip = 0, isGlobalAccess, companyId } = params;

    const where: unknown = {};
    if (!isGlobalAccess && companyId) {
      where.user = { affiliation: { companyId } };
    }

    const logs = await this.repository.findMany(where, limit, skip, {
      createdAt: "desc",
    });

    return logs.map((log) => ({
      id: log.id,
      table_name: log.entity,
      record_id: log.entityId,
      action: log.action,
      performed_by: log.userId,
      performer_name: log.user?.name || "Sistema/Desconhecido",
      old_data: log.oldValues,
      new_data: log.newValues,
      performed_at: log.createdAt.toISOString(),
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      route: log.route,
      metadata: log.metadata,
    }));
  }

  async countLogs(params: { isGlobalAccess: boolean; companyId?: string }) {
    const { isGlobalAccess, companyId } = params;
    const where: unknown = {};
    if (!isGlobalAccess && companyId) {
      where.user = { affiliation: { companyId } };
    }
    return this.repository.count(where);
  }

  async createLog(data: unknown) {
    return this.repository.create(data);
  }
}
