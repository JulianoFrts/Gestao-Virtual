import { NextResponse } from "next/server";
import { SecurityAuditService } from "@/modules/audit/application/security-audit.service";
import { GovernanceService } from "@/modules/audit/application/governance.service";
import { PrismaGovernanceRepository } from "@/modules/audit/infrastructure/prisma-governance.repository";

export async function POST() {
    try {
        // Instantiate dependencies
        const governanceRepo = new PrismaGovernanceRepository();
        const governanceService = new GovernanceService(governanceRepo);
        const securityService = new SecurityAuditService(governanceService);

        const report = await securityService.scanRoutes();

        return NextResponse.json({
            data: report
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
