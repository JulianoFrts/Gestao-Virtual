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
        mockGovernanceService = new GovernanceService(null as unknown) as unknown;

        // Setup Mocks
        (AuditConfigService as jest.Mock).mockImplementation(() => ({
            getEnabledRules: jest.fn().mockReturnValue(["srp", "long-method"]),
            getIgnorePatterns: jest.fn().mockReturnValue(["node_modules"])
        }));

        (GitDiffService as jest.Mock).mockImplementation(() => ({
            getChangedFiles: jest.fn()
        }));

        (HashCacheService as jest.Mock).mockImplementation(() => ({
            shouldAudit: jest.fn().mockReturnValue(true),
            updateCache: jest.fn()
        }));

        auditor = new ArchitecturalAuditor(mockGovernanceService);

        // Access private properties for mocking if needed via 'any' casting or redesign for testability
        // For now relying on constructor initialization
    });

    it("should initialize successfully", () => {
        expect(auditor).toBeDefined();
    });

    // Validar integração completa é complexo em unit test sem muito mocking
    // Focando em lógica de controle de fluxo
});
