import { ArchitecturalAuditor } from "../src/modules/audit/application/architectural-auditor.service";
import { GovernanceService } from "../src/modules/audit/application/governance.service";
import { logger } from "../src/lib/utils/logger";

// Mock Governance Service to decouple from Database
class MockGovernanceRepository {
    async findOpenViolation() { return null; }
    async createViolation() { return { id: "1" }; }
    async updateViolation() { return { id: "1" }; }
    async findOpenViolations() { return []; }
    async getHistory() { return []; }
    async getViolations() { return []; }
}

async function runManualTest() {
    console.log("=== INICIANDO TESTE MANUAL AUDITOR v3.0 ===");

    // Setup Mock
    const mockRepo = new MockGovernanceRepository();
    const governanceService = new GovernanceService(mockRepo as any);

    // Auditor Instance
    const auditor = new ArchitecturalAuditor(governanceService);

    console.log("\n[1] Executando Full Audit (Simulado)...");
    const startTime = Date.now();

    try {
        const { results, summary } = await auditor.runFullAudit("TEST-USER-CLI");

        const duration = (Date.now() - startTime) / 1000;

        console.log("\n=== RESULTADOS ===");
        console.log(`Duração: ${duration.toFixed(2)}s`);
        console.log(`Arquivos Auditados: ${summary.totalFiles}`);
        console.log(`Health Score: ${summary.healthScore}`);
        console.log(`Violações Encontradas: ${summary.violationsCount}`);

        if (results.length > 0) {
            console.log("\nTop 3 Violações:");
            results.slice(0, 3).forEach(r => {
                console.log(`- [${r.severity}] ${r.violation} em ${r.file}`);
            });
        }

        console.log("\n=== FIM DO TESTE ===");
        process.exit(0);

    } catch (error) {
        console.error("Erro fatal no teste:", error);
        process.exit(1);
    }
}

runManualTest();
