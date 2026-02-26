import {
  SystemAuditRepository,
  AuditLogData,
} from "../domain/system-audit.repository";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export class PrismaSystemAuditRepository implements SystemAuditRepository {
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          newValues:
            data.newValues ||
            PrismaSystemAuditRepository.cleanValues(data.newValues),
          oldValues:
            data.oldValues ||
            PrismaSystemAuditRepository.cleanValues(data.oldValues),
        },
      });
    } catch (error) {
      // Audit logging should not block the main flow, but must be logged
      logger.error("Failed to write audit log", { error, data });
    }
  }

  // Helper to ensure JSON compatibility or clean strict structures if needed
  private static cleanValues(values: unknown): any {
    if (!values) return undefined;
    return values;
  }
}
