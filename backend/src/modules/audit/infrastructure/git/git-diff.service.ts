import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "@/lib/utils/logger";
import * as path from "path";

const execAsync = promisify(exec);

export class GitDiffService {
    private readonly rootPath = process.cwd();

    /**
     * Retorna a lista de arquivos alterados em relação à branch main/master
     * ou arquivos não trackeados (novos).
     */
    public async getChangedFiles(): Promise<string[]> {
        try {
            // 1. Verificar se é um repositório git
            await execAsync("git rev-parse --is-inside-work-tree");

            // 2. Obter arquivos modificados (staged + unstaged)
            const { stdout: diffOutput } = await execAsync(
                "git diff --name-only HEAD"
            );

            // 3. Obter arquivos untracked
            const { stdout: untrackedOutput } = await execAsync(
                "git ls-files --others --exclude-standard"
            );

            const allFiles = [
                ...diffOutput.split("\n"),
                ...untrackedOutput.split("\n"),
            ]
                .map((f) => f.trim())
                .filter((f) => f.length > 0)
                .map((f) => path.join(this.rootPath, f));

            const uniqueFiles = [...new Set(allFiles)];

            logger.info(`GitDiffService: ${uniqueFiles.length} arquivos alterados identificados.`);
            return uniqueFiles;

        } catch (error) {
            logger.warn(
                "GitDiffService: Não foi possível detectar alterações via Git. Retornando lista vazia (Full Scan necessário).",
                { error }
            );
            return [];
        }
    }
}
