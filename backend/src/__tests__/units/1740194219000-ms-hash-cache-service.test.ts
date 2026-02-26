/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03: 40 /* literal */ **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { HashCacheService } from "@/modules/audit/infrastructure/cache/hash-cache.service";

describe("HashCacheService", () => {
  let service: HashCacheService;

  beforeEach(() => {
    service = new HashCacheService();
  });

  it("should return true for new files", () => {
    const should = service.shouldAudit("test.ts", "content");
    expect(should).toBe(true);
  });

  it("should return false for cached unchanged files", () => {
    service.updateCache("test.ts", "content", 0);
    const should = service.shouldAudit("test.ts", "content");
    expect(should).toBe(false);
  });

  it("should return true if content changed", () => {
    service.updateCache("test.ts", "old content", 0);
    const should = service.shouldAudit("test.ts", "new content");
    expect(should).toBe(true);
  });

  it("should clear cache", () => {
    service.updateCache("test.ts", "content", 0);
    service.clearCache();
    const should = service.shouldAudit("test.ts", "content");
    expect(should).toBe(true);
  });
});
