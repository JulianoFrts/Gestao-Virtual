import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api";
import { requireAdmin, requireAuth } from "@/lib/auth/session";
import { ArchitecturalAuditor } from "@/modules/audit/application/architectural-auditor.service";
import { logger } from "@/lib/utils/logger";
import { GovernanceService } from "@/modules/audit/application/governance.service";
import { PrismaGovernanceRepository } from "@/modules/audit/infrastructure/prisma-governance.repository";

const governanceService = new GovernanceService(
  new PrismaGovernanceRepository(),
);

export async function HEAD() {
  return ApiResponse.noContent();
}

export async function POST(_request: NextRequest) {
  try {
    const user = await requireAdmin();

    logger.info(
      "Disparando Auditoria Arquitetural via API Central de Segurança",
      {
        performedBy: user.name,
        userId: user.id,
      },
    );

    const auditor = new ArchitecturalAuditor(governanceService);
    const { summary } = await auditor.runFullAudit(user.id);

    const currentViolations = await governanceService.listViolationsWithFilters(
      { status: "OPEN" },
    );

    // Retorna violações + Health Score para o frontend exibir
    return ApiResponse.json({
      violations: currentViolations,
      healthScore: summary.healthScore,
      totalFiles: summary.totalFiles,
      bySeverity: summary.bySeverity,
      topIssues: summary.topIssues,
    });
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/audit/architectural/route.ts#POST",
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { validateToken, requireAuth } = await import("@/lib/auth/session");
    let currentUser;

    // Suporte a Token na URL para SSE
    const token = request.nextUrl.searchParams.get("token");
    if (token) {
      const session = await validateToken(token);
      if (session?.user) currentUser = session.user;
    }

    if (!currentUser) {
      await requireAuth();
    }
    const { CONSTANTS } = await import("@/lib/constants");
    const searchParams = request.nextUrl.searchParams;
    const where = processAuditFilters(searchParams);

    const stream = generateAuditStream(where, CONSTANTS);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/audit/architectural/route.ts#GET",
    );
  }
}

function processAuditFilters(searchParams: URLSearchParams): any {
  const minSeverity = searchParams.get("minSeverity");
  const startDate = searchParams.get("startDate"); // YYYY-MM-DD
  const endDate = searchParams.get("endDate"); // YYYY-MM-DD

  const where: any = { status: "OPEN" };

  if (minSeverity === "MEDIUM") {
    where.severity = { in: ["MEDIUM", "HIGH", "CRITICAL"] };
  } else if (minSeverity === "HIGH") {
    where.severity = { in: ["HIGH", "CRITICAL"] };
  }

  if (startDate || endDate) {
    where.lastDetectedAt = {};
    if (startDate) {
      where.lastDetectedAt.gte = new Date(startDate);
    }
    if (endDate) {
      const { CONSTANTS } = require("@/lib/constants");
      const end = new Date(endDate);
      end.setHours(
        CONSTANTS.TIME.END_OF_DAY.HOURS,
        CONSTANTS.TIME.END_OF_DAY.MINUTES,
        CONSTANTS.TIME.END_OF_DAY.SECONDS,
        CONSTANTS.TIME.END_OF_DAY.MS
      );
      where.lastDetectedAt.lte = end;
    }
  }
  return where;
}

/**
 * Função Auxiliar para gerar o Stream de Auditoria (SRP)
 */
function generateAuditStream(where: any, CONSTANTS: any): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: any) => {
        try {
          const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(event));
        } catch (e) {
          // Cliente desconectou
        }
      };

      try {
        const total = await governanceService.countViolations(where);
        sendEvent("start", { total });

        const BATCH_SIZE = CONSTANTS.API.BATCH.SIZE;
        let processed = 0;

        while (processed < total) {
          const violations = await governanceService.listViolationsWithFilters(
            where,
            BATCH_SIZE,
            processed
          );

          if (violations.length === 0) break;

          const weights = CONSTANTS.AUDIT.WEIGHTS;
          violations.sort((a: any, b: any) => {
            const weightA = weights[a.severity] ?? 0;
            const weightB = weights[b.severity] ?? 0;
            return weightB - weightA;
          });

          processed += violations.length;
          const progress = Math.round((processed / total) * 100);

          sendEvent("batch", {
            items: violations,
            current: processed,
            total,
            progress
          });

          await new Promise((resolve) => setTimeout(resolve, CONSTANTS.API.THROTTLE.MS));
        }

        sendEvent("complete", { total });
      } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        sendEvent("error", { message });
      } finally {
        controller.close();
      }
    }
  });
}
