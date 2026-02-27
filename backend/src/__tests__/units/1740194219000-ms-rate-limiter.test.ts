/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03: 45 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { checkRateLimit } from "@/lib/utils/rate-limiter";

describe("RateLimiter", () => {
  it("should allow requests within limit", () => {
    const identifier = "test-ip-1";
    const result = checkRateLimit(identifier, { maxRequests: 2 });
    expect(result.blocked).toBe(false);
    expect(result.remaining).toBe(1);
  });

  it("should block requests exceeding limit", () => {
    const identifier = "test-ip-2";
    // First request
    checkRateLimit(identifier, { maxRequests: 1 });
    // Second request
    const result = checkRateLimit(identifier, { maxRequests: 1 });
    expect(result.blocked).toBe(true);
    expect(result.message).toContain("Limite de requisições excedido");
  });

  it("should use default config if not provided", () => {
    const identifier = "test-ip-3";
    const result = checkRateLimit(identifier);
    expect(result.blocked).toBe(false);
    expect(result.remaining).toBeGreaterThan(0);
  });
});
