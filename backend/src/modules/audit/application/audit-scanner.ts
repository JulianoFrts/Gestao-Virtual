import * as fs from "fs";
import * as path from "path";
import { logger } from "@/lib/utils/logger";
import { AuditConfigService } from "../infrastructure/config/audit-config.service";
import { GitDiffService } from "../infrastructure/git/git-diff.service";

export class AuditScanner {
    constructor(
        private readonly srcPath: string,
        private readonly configService: AuditConfigService,
        private readonly gitService: GitDiffService
    ) { }

    public async getFilesToAudit(incremental: boolean = false): Promise<string[]> {
        if (incremental) {
            const files = await this.gitService.getChangedFiles();
            if (files.length === 0) {
                return [];
            }
            return files;
        }

        return this.getAllFilesAsync(this.srcPath);
    }

    private async getAllFilesAsync(dir: string): Promise<string[]> {
        let results: string[] = [];
        const ignorePatterns = this.configService.getIgnorePatterns();

        try {
            const list = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of list) {
                if (ignorePatterns.includes(entry.name)) continue;

                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    results = results.concat(await this.getAllFilesAsync(fullPath));
                } else {
                    if (
                        (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) &&
                        !fullPath.endsWith(".d.ts")
                    ) {
                        results.push(fullPath);
                    }
                }
            }
        } catch (e) {
            logger.warn(`Erro ao ler diretório: ${dir}`, { error: e });
        }
        return results;
    }
}
