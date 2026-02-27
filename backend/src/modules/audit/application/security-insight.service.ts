import { AuditLogRepository } from "../domain/audit-log.repository";
import { logger } from "@/lib/utils/logger";

export interface SecurityInsight {
  duplicateHwids: {
    hwid: string;
    users: string[];
    count: number;
  }[];
  unknownDevices: {
    userId: string;
    userName: string;
    device: string;
    ip: string;
    timestamp: string;
  }[];
  topIps: {
    ip: string;
    count: number;
    lastSeen: string;
  }[];
  accessTimeline: {
    hour: number;
    count: number;
  }[];
  summary: {
    totalLogs: number;
    uniqueDevices: number;
    uniqueIps: number;
    suspiciousEvents: number;
  };
}

/**
 * SecurityInsightService — Agente 5 (Inteligência Forense)
 * Agrega dados de metadata dos AuditLogs para detectar padrões suspeitos.
 */
export class SecurityInsightService {
  constructor(private readonly repository: AuditLogRepository) {}

  async generateInsights(companyId?: string): Promise<SecurityInsight> {
    const where: any = {};
    if (companyId) {
      where.user = { affiliation: { companyId } };
    }

    // Buscar últimos 500 logs para análise
    const logs = await this.repository.findMany(where, 500, 0, {
      createdAt: "desc",
    });

    const hwidMap = new Map<string, Set<string>>();
    const ipMap = new Map<string, { count: number; lastSeen: string }>();
    const deviceSet = new Set<string>();
    const hourMap = new Map<number, number>();
    const unknownDevices: SecurityInsight["unknownDevices"] = [];

    for (const log of logs) {
      const meta = log.metadata as unknown;
      if (!meta) continue;

      // HWID Analysis
      const hwid = meta.hwid || meta.device?.hwid;
      if (hwid && log.userId) {
        if (!hwidMap.has(hwid)) hwidMap.set(hwid, new Set());
        hwidMap.get(hwid)!.add(log.userId);
      }

      // IP Analysis
      const ip = log.ipAddress || meta.ip;
      if (ip && ip !== "CAPTURING_BY_BACKEND") {
        const existing = ipMap.get(ip) || { count: 0, lastSeen: "" };
        existing.count++;
        existing.lastSeen = log.createdAt?.toISOString() || existing.lastSeen;
        ipMap.set(ip, existing);
      }

      // Device Tracking
      const deviceKey = meta.device
        ? `${meta.device.os}-${meta.device.browser}-${meta.device.model}`
        : log.userAgent || "unknown";
      deviceSet.add(deviceKey);

      // Timeline Analysis by hour
      if (log.createdAt) {
        const hour = new Date(log.createdAt).getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      }
    }

    // Detect duplicate HWIDs (same HWID, multiple users = account sharing)
    const duplicateHwids: SecurityInsight["duplicateHwids"] = [];
    for (const [hwid, users] of hwidMap.entries()) {
      if (users.size > 1) {
        duplicateHwids.push({
          hwid,
          users: Array.from(users),
          count: users.size,
        });
      }
    }

    // Top IPs
    const topIps = Array.from(ipMap.entries())
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        lastSeen: data.lastSeen,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Access Timeline
    const accessTimeline = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourMap.get(i) || 0,
    }));

    const suspiciousEvents = duplicateHwids.length + unknownDevices.length;

    logger.info(
      `SecurityInsight gerado: ${logs.length} logs, ${suspiciousEvents} eventos suspeitos`,
      {
        source: "SecurityInsightService",
      },
    );

    return {
      duplicateHwids,
      unknownDevices,
      topIps,
      accessTimeline,
      summary: {
        totalLogs: logs.length,
        uniqueDevices: deviceSet.size,
        uniqueIps: ipMap.size,
        suspiciousEvents,
      },
    };
  }
}
