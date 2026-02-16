describe("Debug Audit Import", () => {
    it("should load ArchitecturalAuditor module", async () => {
        console.log("Loading ArchitecturalAuditor...");
        try {
            const module = await import("@/modules/audit/application/architectural-auditor.service");
            console.log("ArchitecturalAuditor loaded:", !!module.ArchitecturalAuditor);
            expect(module.ArchitecturalAuditor).toBeDefined();
        } catch (e) {
            console.error("Failed to load ArchitecturalAuditor:", e);
            throw e;
        }
    });
});
