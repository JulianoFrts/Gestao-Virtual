import { logger } from "../../lib/utils/logger";

describe("Logger", () => {
    let spy: jest.SpyInstance;

    beforeEach(() => {
        spy = jest.spyOn(console, "log").mockImplementation(() => { });
    });

    afterEach(() => {
        spy.mockRestore();
    });

    it("should log info messages", () => {
        logger.info("Test message", { source: "test" });
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain("Log.Info");
        expect(spy.mock.calls[0][0]).toContain("Test message");
        expect(spy.mock.calls[0][0]).toContain("test");
    });

    it("should log error messages", () => {
        const error = new Error("Sample error");
        logger.error("Error occurred", { error, source: "error-source" });
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain("Log.Error");
        expect(spy.mock.calls[0][0]).toContain("Sample error");
        expect(spy.mock.calls[0][0]).toContain("error-source");
    });

    it("should log request messages", () => {
        logger.request("GET", "/api/test", 200, 150, { source: "request-source" });
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain("GET /api/test 200 150ms");
    });

    it("should create child loggers with context", () => {
        const childLogger = logger.child({ source: "child-source", userId: "user-123" });
        childLogger.info("Child message");
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain("child-source");
        expect(spy.mock.calls[0][0]).toContain("user-123");
        expect(spy.mock.calls[0][0]).toContain("Child message");
    });
});
