/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03:40 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { ArchitecturalAuditor } from "@/modules/audit/application/architectural-auditor.service";
import { GovernanceService } from "@/modules/audit/application/governance.service";
import { AuditConfigService } from "@/modules/audit/infrastructure/config/audit-config.service";
import { GitDiffService } from "@/modules/audit/infrastructure/git/git-diff.service";
import { HashCacheService } from "@/modules/audit/infrastructure/cache/hash-cache.service";

// Mocks
jest.mock("@/modules/audit/application/governance.service");
jest.mock("@/modules/audit/infrastructure/config/audit-config.service");
jest.mock("@/modules/audit/infrastructure/git/git-diff.service");
jest.mock("@/modules/audit/infrastructure/cache/hash-cache.service");
jest.mock("@/lib/utils/logger");

describe("ArchitecturalAuditor v3.0", () => {
  let auditor: ArchitecturalAuditor;
  let mockGovernanceService: jest.Mocked<GovernanceService>;
  let mockConfigService: jest.Mocked<AuditConfigService>;
  let mockGitService: jest.Mocked<GitDiffService>;
  let mockCacheService: jest.Mocked<HashCacheService>;

  beforeEach(() => {
    mockGovernanceService = new GovernanceService(null as any) as any;

    // Setup Mocks
    (AuditConfigService as jest.Mock).mockImplementation(() => ({
      getEnabledRules: jest.fn().mockReturnValue(["srp", "long-method"]),
      getIgnorePatterns: jest.fn().mockReturnValue(["node_modules"]),
    }));

    (GitDiffService as jest.Mock).mockImplementation(() => ({
      getChangedFiles: jest.fn(),
    }));

    (HashCacheService as jest.Mock).mockImplementation(() => ({
      shouldAudit: jest.fn().mockReturnValue(true),
      updateCache: jest.fn(),
    }));

    auditor = new ArchitecturalAuditor(mockGovernanceService);
  });

  it("should initialize successfully", () => {
    expect(auditor).toBeDefined();
  });
});
