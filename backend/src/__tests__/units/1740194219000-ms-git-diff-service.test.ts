/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03: 40 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { GitDiffService } from "@/modules/audit/infrastructure/git/git-diff.service";
import * as child_process from "child_process";
import * as path from "path";

jest.mock("child_process");
jest.mock("@/lib/utils/logger");

describe("GitDiffService", () => {
  let service: GitDiffService;
  const mockExec = jest.mocked(child_process.exec);

  beforeEach(() => {
    service = new GitDiffService();
    jest.resetAllMocks();
  });

  it("should return changed files correctly", async () => {
    // Mock successful git execution
    mockExec.mockImplementation(((cmd: string, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
      if (cmd.includes("rev-parse")) return callback(null, "true", "");
      if (cmd.includes("git diff"))
        return callback(null, "file1.ts\nfile2.ts", "");
      if (cmd.includes("ls-files"))
        return callback(null, "newfile.ts", "");
      return callback(new Error("Unknown command"), "", "");
    }) as any);

    const files = await service.getChangedFiles();

    expect(files).toHaveLength(3);
    expect(files).toContain(path.join(process.cwd(), "file1.ts"));
    expect(files).toContain(path.join(process.cwd(), "newfile.ts"));
  });

  it("should return empty array if git fails", async () => {
    mockExec.mockImplementation(((cmd: string, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
      return callback(new Error("Git not found"), "", "");
    }) as any);

    const files = await service.getChangedFiles();

    expect(files).toEqual([]);
  });
});
