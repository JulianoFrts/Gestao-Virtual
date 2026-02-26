import { logger } from "@/lib/utils/logger";
describe("Debug Audit Import", () => {
    it("should load ArchitecturalAuditor module", async () => {
        logger.debug("Loading ArchitecturalAuditor...");
        try {
            const module = await import("@/modules/audit/application/architectural-auditor.service");
            logger.debug("ArchitecturalAuditor loaded:", !!module.ArchitecturalAuditor);
            expect(module.ArchitecturalAuditor).toBeDefined();
        } catch (e) {
            console.error("Failed to load ArchitecturalAuditor:", e);
            throw e;
        }
    });
});
