import { GitDiffService } from "../../../../modules/audit/infrastructure/git/git-diff.service";
import * as child_process from "child_process";
import * as path from "path";

jest.mock("child_process");
jest.mock("@/lib/utils/logger");

describe("GitDiffService", () => {
    let service: GitDiffService;
    const mockExec = child_process.exec as unknown as jest.Mock;

    beforeEach(() => {
        service = new GitDiffService();
        jest.resetAllMocks();
    });

    it("should return changed files correctly", async () => {
        // Mock successful git execution
        mockExec.mockImplementation((cmd: string, callback: any) => {
            if (cmd.includes("rev-parse")) return callback(null, { stdout: "true" });
            if (cmd.includes("git diff")) return callback(null, { stdout: "file1.ts\nfile2.ts" });
            if (cmd.includes("ls-files")) return callback(null, { stdout: "newfile.ts" });
            return callback(new Error("Unknown command"));
        });

        const files = await service.getChangedFiles();

        expect(files).toHaveLength(3);
        expect(files).toContain(path.join(process.cwd(), "file1.ts"));
        expect(files).toContain(path.join(process.cwd(), "newfile.ts"));
    });

    it("should return empty array if git fails", async () => {
        mockExec.mockImplementation((cmd: string, callback: any) => {
            return callback(new Error("Git not found"));
        });

        const files = await service.getChangedFiles();

        expect(files).toEqual([]);
    });
});
