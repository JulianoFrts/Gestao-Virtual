import { ArchitecturalAuditor } from "../application/architectural-auditor.service";
import { GovernanceService } from "../application/governance.service";
import { PrismaGovernanceRepository } from "../infrastructure/prisma-governance.repository";
import { logger } from "../../../lib/utils/logger";

async function main() {
  const repository = new PrismaGovernanceRepository();
  const governanceService = new GovernanceService(repository);
  const auditor = new ArchitecturalAuditor(governanceService);

  try {
    const { results: auditResults } = await auditor.runFullAudit();

    const count = auditResults.length;
    if (count > 0) {
      console.log("\n---  RESUMO DA AUDITORIA  ---");
      console.log(`Total de apontamentos: ${count}`);
    }
  } catch (error) {
    logger.error("Falha crítica na execução da auditoria", {
      error,
      source: "Audit/Runner",
    });
  }
}

main();
