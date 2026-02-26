/**
 * Smoke Test - API v1 - GESTÃO VIRTUAL
 * Validação de rotas críticas após migração DDD.
 */

import request from "supertest";

const appUrl = process.env.APP_URL || "http://localhost: 3000 /* literal */";
const apiPrefix = "/api/v1";

describe("Smoke Test - API v1", () => {
  describe("Public Routes / Metadata", () => {
    it("should return API health/version info", async () => {
      // Nota: Algumas rotas podem não existir ou exigir auth.
      // Usamos o bypass=true descoberto no core.ts para testes locais.
      const response = await request(appUrl).get(
        `${apiPrefix}/auth/session?bypass=true`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
    });
  });

  describe("Engineering Modules (DDD Check)", () => {
    it("should fetch projects list", async () => {
      const response = await request(appUrl).get(
        `${apiPrefix}/projects?bypass=true`,
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it("should fetch tower elements (Map Elements)", async () => {
      const response = await request(appUrl).get(
        `${apiPrefix}/map_elements?bypass=true`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should fetch segments", async () => {
      const response = await request(appUrl).get(
        `${apiPrefix}/segments?bypass=true`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should fetch circuits", async () => {
      const response = await request(appUrl).get(
        `${apiPrefix}/circuits?bypass=true`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });
});
