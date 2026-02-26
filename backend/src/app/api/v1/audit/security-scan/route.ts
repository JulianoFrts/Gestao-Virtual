import { NextResponse } from "next/server";
import { SecurityAuditService } from "@/modules/audit/application/security-audit.service";
import { GovernanceService } from "@/modules/audit/application/governance.service";
import { PrismaGovernanceRepository } from "@/modules/audit/infrastructure/prisma-governance.repository";
import { HTTP_STATUS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth/session";

export async function POST(): Promise<Response> {
    try {
        await requireAdmin();
        // Instantiate dependencies
        const governanceRepo = new PrismaGovernanceRepository();
        const governanceService = new GovernanceService(governanceRepo);
        const securityService = new SecurityAuditService(governanceService);

        const report = await securityService.scanRoutes();

        return NextResponse.json({
            data: report
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: error.message }, { status: HTTP_STATUS.INTERNAL_ERROR });
    }
}
