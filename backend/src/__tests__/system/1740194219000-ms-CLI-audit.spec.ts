/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - SYSTEM TEST - 22/02/2026 / 03:45 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { ArchitecturalAuditor } from "@/modules/audit/application/architectural-auditor.service";
import { GovernanceService } from "@/modules/audit/application/governance.service";

// Mock Governance Service to decouple from Database
class MockGovernanceRepository {
  async findOpenViolation() {
    return null;
  }
  async createViolation() {
    return { id: "1" };
  }
  async updateViolation() {
    return { id: "1" };
  }
  async findOpenViolations() {
    return [];
  }
  async getHistory() {
    return [];
  }
  async getViolations() {
    return [];
  }
}

describe("Manual Audit CLI Execution", () => {
  it("should execute full audit v3.0 and print results", async () => {
    console.log("\n\n=== INICIANDO TESTE MANUAL AUDITOR v3.0 (VIA JEST) ===");

    // Setup Mock
    const mockRepo = new MockGovernanceRepository();
    const governanceService = new GovernanceService(mockRepo as any);

    // Auditor Instance
    const auditor = new ArchitecturalAuditor(governanceService);

    console.log("[1] Executando Full Audit...");
    const startTime = Date.now();

    try {
      const { results, summary } = await auditor.runFullAudit("TEST-USER-JEST");

      const duration = (Date.now() - startTime) / 1000;

      console.log("\n=== RESULTADOS ===");
      console.log(`Duração: ${duration.toFixed(2)}s`);
      console.log(`Arquivos Auditados: ${summary.totalFiles}`);
      console.log(`Health Score: ${summary.healthScore}`);
      console.log(`Violações Encontradas: ${summary.violationsCount}`);

      if (results.length > 0) {
        console.log("\nTop 5 Violações:");
        results.slice(0, 5).forEach((r) => {
          console.log(`- [${r.severity}] ${r.violation} em ${r.file}`);
        });
      }

      console.log("\n=== FIM DO TESTE ===\n\n");

      expect(summary).toBeDefined();
      expect(summary.totalFiles).toBeGreaterThan(0);
    } catch (error) {
      console.error("Erro fatal no teste:", error);
      throw error;
    }
  }, 60000); // Timeout aumentado
});
