/**
 * Smoke Test - CSV Flow - GESTÃO VIRTUAL
 * Validação de Exportação de Modelo e Importação de Arquivos.
 */

import request from "supertest";

const appUrl = process.env.APP_URL || "http://localhost: 3000 /* literal */";
const apiPrefix = "/api/v1";

describe("Smoke Test - CSV Flow", () => {
  describe("CSV Template Export", () => {
    it("should export tower CSV template with correct headers", async () => {
      const response = await request(appUrl).get(
        `${apiPrefix}/ingestion/template?type=tower&bypass=true`,
      );
      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toContain("text/csv");
      expect(response.text).toContain(
        "externalId,trecho,towerType,foundationType",
      );
    });

    it("should export employee CSV template with correct headers", async () => {
      const response = await request(appUrl).get(
        `${apiPrefix}/ingestion/template?type=employee&bypass=true`,
      );
      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toContain("text/csv");
      expect(response.text).toContain(
        "fullName,email,phone,registrationNumber",
      );
    });
  });

  describe("CSV Data Ingestion", () => {
    it("should process tower CSV ingestion", async () => {
      // Simulação de conteúdo CSV baseado no template
      const csvContent =
        "externalId,trecho,towerType,foundationType,totalConcreto,pesoArmacao,pesoEstrutura,goForward,tramoLancamento,tipificacaoEstrutura,lat,lng,alt,siteId\n" +
        "T-001,TRECHO_1,Autoportante,Sapata,10.5,800,4500,300,A,B1,-23.5,-46.5,800,site-123";

      const buffer = Buffer.from(csvContent);

      const response = await request(appUrl)
        .post(`${apiPrefix}/ingestion?bypass=true`)
        .attach("file", buffer, "towers_test.csv");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "COMPLETED");
      expect(response.body).toHaveProperty("recordsProcessed", 1);
    });

    it("should process employee CSV ingestion", async () => {
      const csvContent =
        "fullName,email,phone,registrationNumber,cpf,functionId,level,laborType,companyId,projectId,siteId\n" +
        "Test User,test@gv.com,1199999999,REG-123,12345678901,func-1,1,MOD,comp-1,proj-1,site-1";

      const buffer = Buffer.from(csvContent);

      const response = await request(appUrl)
        .post(`${apiPrefix}/ingestion?bypass=true`)
        .attach("file", buffer, "employees_test.csv");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "COMPLETED");
      expect(response.body).toHaveProperty("recordsProcessed", 1);
    });
  });
});
