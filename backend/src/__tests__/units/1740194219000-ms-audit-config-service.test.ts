/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03: 40 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { AuditConfigService } from "@/modules/audit/infrastructure/config/audit-config.service";
import * as fs from "fs";
import * as path from "path";

jest.mock("fs");
jest.mock("@/lib/utils/logger");

describe("AuditConfigService", () => {
  let service: AuditConfigService;
  const mockConfigPath = path.join(process.cwd(), ".auditrc.json");

  beforeEach(() => {
    service = new AuditConfigService();
    jest.resetAllMocks();
  });

  it("should return default config if file does not exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const config = service.loadConfig();

    expect(config.rules["srp"]).toBe(true);
    expect(config.ignore).toContain("node_modules");
  });

  it("should load valid config from file", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        rules: { "my-rule": true },
        ignore: ["test-ignore"],
      }),
    );

    const config = service.loadConfig();

    expect(config.rules["my-rule"]).toBe(true);
    expect(config.ignore).toContain("test-ignore");
  });

  it("should return default config if validation fails", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        rules: "invalid-type",
      }),
    );

    const config = service.loadConfig();

    expect(config.rules["srp"]).toBe(true); // Fallback to default
  });

  it("should correctly identify enabled rules", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        rules: {
          "rule-a": true,
          "rule-b": false,
          "rule-c": ["error", { max: 50 }],
          "rule-d": "off",
        },
      }),
    );

    const enabled = service.getEnabledRules();

    expect(enabled).toContain("rule-a");
    expect(enabled).toContain("rule-c");
    expect(enabled).not.toContain("rule-b");
    expect(enabled).not.toContain("rule-d");
  });
});
