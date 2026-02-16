import { AuditLogRepository } from "../domain/audit-log.repository";

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) { }

  async listLogs(params: {
    limit: number;
    skip?: number;
    isAdmin: boolean;
    companyId?: string;
  }) {
    const { limit, skip = 0, isAdmin, companyId } = params;

    const where: any = {};
    if (!isAdmin && companyId) {
      where.user = { companyId };
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
    }));
  }

  async countLogs(params: { isAdmin: boolean; companyId?: string }) {
    const { isAdmin, companyId } = params;
    const where: any = {};
    if (!isAdmin && companyId) {
      where.user = { companyId };
    }
    return this.repository.count(where);
  }

  async createLog(data: any) {
    return this.repository.create(data);
  }
}
