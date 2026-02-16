import { logger } from "@/lib/utils/logger";

describe("Smoke Test", () => {
    it("should pass", () => {
        logger.info("Smoke test logger check");
        expect(true).toBe(true);
        console.log("SMOKE TEST OK");
    });
});
