import "dotenv/config";
import { prisma } from "../src/lib/prisma/client";
import { ArchitecturalAuditor } from "../src/modules/audit/application/architectural-auditor.service";

async function main() {
  console.log("Starting Audit Scan...");
  try {
    const auditor = new ArchitecturalAuditor();
    const results = await auditor.runFullAudit("system-cli");
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
