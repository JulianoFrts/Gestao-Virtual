import "dotenv/config";
import { prisma } from "../src/lib/prisma/client";
import { ArchitecturalAuditor } from "../src/modules/audit/application/architectural-auditor.service";
import { GovernanceService } from "../src/modules/audit/application/governance.service";
import { PrismaGovernanceRepository } from "../src/modules/audit/infrastructure/prisma-governance.repository";

async function main() {
  console.log("Starting Audit Scan...");
  try {
    const governanceRepo = new PrismaGovernanceRepository();
    const governanceService = new GovernanceService(governanceRepo);
    const auditor = new ArchitecturalAuditor(governanceService);
    const results = await auditor.runFullAudit("cmm3hdihj000btr14kjz104hc");
    console.log("---RESULTS_START---");
    console.log(JSON.stringify(results, null, 2));
    console.log("---RESULTS_END---");
  } catch (error) {
    console.error("Error running audit:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
