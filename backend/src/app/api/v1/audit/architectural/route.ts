import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api";
import { requireAdmin, requireAuth } from "@/lib/auth/session";
import { ArchitecturalAuditor } from "@/modules/audit/application/architectural-auditor.service";
import { logger } from "@/lib/utils/logger";
import { GovernanceService } from "@/modules/audit/application/governance.service";
import { PrismaGovernanceRepository } from "@/modules/audit/infrastructure/prisma-governance.repository";
import { CONSTANTS } from "@/lib/constants";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const governanceService = new GovernanceService(
  new PrismaGovernanceRepository(),
);

export async function HEAD(): Promise<Response> {
  return ApiResponse.noContent();
}

const auditRequestSchema = z.object({
  stream: z.boolean().optional(),
  token: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  forensicData: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const validation = auditRequestSchema.safeParse(rawBody);
    
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }
    
    const body = validation.data;

    // Se houver sinal de stream no corpo, tratamos como requisição de stream
    if (body.stream === true || body.token) {
      const user = await requireAuth(request);

      const companyId = user.companyId;
      const where = processAuditFilters(
        new URLSearchParams(body.filters as Record<string, string> || {}),
        companyId,
      );
      const stream = generateAuditStream(where, CONSTANTS);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Lógica Original: Executar Auditoria (Apenas Admin)
    const user = await requireAdmin(request);

    logger.info(
      "Disparando Auditoria Arquitetural via API Central de Segurança",
      {
        performedBy: user.name,
        userId: user.id,
      },
    );

    const companyId = user.companyId;
    const auditor = new ArchitecturalAuditor(governanceService);
    const { summary } = await auditor.runFullAudit(user.id, companyId);

    const currentViolations = await governanceService.listViolationsWithFilters(
      { status: "OPEN", companyId },
    );

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

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const companyId = user.companyId;
    const where = processAuditFilters(searchParams, companyId);

    const stream = generateAuditStream(where, CONSTANTS);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/audit/architectural/route.ts#GET",
    );
  }
}

function processAuditFilters(
  searchParams: URLSearchParams,
  companyId?: string,
): Prisma.GovernanceAuditHistoryWhereInput {
  const minSeverity = searchParams.get("minSeverity");
  const startDate = searchParams.get("startDate"); // YYYY-MM-DD
  const endDate = searchParams.get("endDate"); // YYYY-MM-DD

  const where: Prisma.GovernanceAuditHistoryWhereInput = { status: "OPEN" };
  if (companyId) where.companyId = companyId;

  if (minSeverity === "MEDIUM") {
    where.severity = { in: ["MEDIUM", "HIGH", "CRITICAL"] };
  } else if (minSeverity === "HIGH") {
    where.severity = { in: ["HIGH", "CRITICAL"] };
  }

  if (startDate || endDate) {
    where.lastDetectedAt = {};
    if (startDate) {
      (where.lastDetectedAt as Prisma.DateTimeFilter).gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(
        CONSTANTS.TIME.END_OF_DAY.HOURS,
        CONSTANTS.TIME.END_OF_DAY.MINUTES,
        CONSTANTS.TIME.END_OF_DAY.SECONDS,
        CONSTANTS.TIME.END_OF_DAY.MS,
      );
      (where.lastDetectedAt as Prisma.DateTimeFilter).lte = end;
    }
  }
  return where;
}

/**
 * Função Auxiliar para gerar o Stream de Auditoria (SRP)
 */
function generateAuditStream(where: Prisma.GovernanceAuditHistoryWhereInput, constants: typeof CONSTANTS): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller): Promise<void> {
      const sendEvent = (type: string, data: Record<string, unknown>) => {
        try {
          const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(event));
        } catch {
          // Cliente desconectou
        }
      };

      try {
        const total = await governanceService.countViolations(where);
        sendEvent("start", { total });

        const BATCH_SIZE = constants.API.BATCH.SIZE;
        let processed = 0;

        while (processed < total) {
          const violations = await governanceService.listViolationsWithFilters(
            where as any,
            BATCH_SIZE,
            processed,
          );

          if (violations.length === 0) break;

          const weights: Record<string, number> = constants.AUDIT.WEIGHTS as any;
          violations.sort((a, b) => {
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
            progress,
          });

          await new Promise((resolve) =>
            setTimeout(resolve, constants.API.THROTTLE.MS),
          );
        }

        sendEvent("complete", { total });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        sendEvent("error", { message });
      } finally {
        controller.close();
      }
    },
  });
}
