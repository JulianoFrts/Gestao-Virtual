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
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const where = processAuditFilters(searchParams);

    const violations = await governanceService.listViolationsWithFilters(where);

    // Manual sort to ensure Correct Severity Order (HIGH > MEDIUM > LOW)
    const severityWeight = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    violations.sort((a: any, b: any) => {
      const weightA =
        severityWeight[a.severity as keyof typeof severityWeight] || 0;
      const weightB =
        severityWeight[b.severity as keyof typeof severityWeight] || 0;
      return weightB - weightA; // Descending weight
    });

    return ApiResponse.json(violations);
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
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.lastDetectedAt.lte = end;
    }
  }
  return where;
}
