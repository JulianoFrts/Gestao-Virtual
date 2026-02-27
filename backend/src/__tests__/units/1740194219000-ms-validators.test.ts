/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03: 35 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import {
  emailSchema,
  passwordSchema,
  nameSchema,
  loginSchema,
  registerSchema,
  paginationSchema,
  validate,
} from "@/lib/utils/validators/schemas";

describe("Validators", () => {
  // =============================================
  // EMAIL
  // =============================================

  describe("emailSchema", () => {
    it("deve aceitar email válido", () => {
      const result = emailSchema.safeParse("teste@exemplo.com");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("teste@exemplo.com");
      }
    });

    it("deve normalizar email para minúsculas", () => {
      const result = emailSchema.safeParse("TESTE@EXEMPLO.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("teste@exemplo.com");
      }
    });

    it("deve rejeitar email inválido", () => {
      const result = emailSchema.safeParse("email-invalido");
      expect(result.success).toBe(false);
    });

    it("deve rejeitar email muito curto", () => {
      const result = emailSchema.safeParse("a@b");
      expect(result.success).toBe(false);
    });
  });

  // =============================================
  // SENHA
  // =============================================

  describe("passwordSchema", () => {
    it("deve aceitar senha forte", () => {
      const result = passwordSchema.safeParse("SenhaForte123");
      expect(result.success).toBe(true);
    });

    it("deve rejeitar senha muito curta", () => {
      const result = passwordSchema.safeParse("Abc1");
      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha sem maiúscula", () => {
      const result = passwordSchema.safeParse("senhafraca123");
      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha sem minúscula", () => {
      const result = passwordSchema.safeParse("SENHAFRACA123");
      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha sem número", () => {
      const result = passwordSchema.safeParse("SenhaFracaSemNumero");
      expect(result.success).toBe(false);
    });
  });

  // =============================================
  // NOME
  // =============================================

  describe("nameSchema", () => {
    it("deve aceitar nome válido", () => {
      const result = nameSchema.safeParse("João da Silva");
      expect(result.success).toBe(true);
    });

    it("deve aceitar nome com acentos", () => {
      const result = nameSchema.safeParse("José André Oliveira");
      expect(result.success).toBe(true);
    });

    it("deve rejeitar nome muito curto", () => {
      const result = nameSchema.safeParse("A");
      expect(result.success).toBe(false);
    });

    it("deve rejeitar nome com caracteres especiais", () => {
      const result = nameSchema.safeParse("Nome@123");
      expect(result.success).toBe(false);
    });
  });

  // =============================================
  // LOGIN
  // =============================================

  describe("loginSchema", () => {
    it("deve aceitar login válido", () => {
      const result = loginSchema.safeParse({
        email: "usuario@teste.com",
        password: "qualquer123",
      });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar login sem email", () => {
      const result = loginSchema.safeParse({
        password: "senha123",
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar login sem senha", () => {
      const result = loginSchema.safeParse({
        email: "usuario@teste.com",
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================
  // REGISTRO
  // =============================================

  describe("registerSchema", () => {
    it("deve aceitar registro válido", () => {
      const result = registerSchema.safeParse({
        email: "novo@usuario.com",
        name: "Novo Usuário",
        password: "SenhaForte123",
        confirmPassword: "SenhaForte123",
      });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar senhas diferentes", () => {
      const result = registerSchema.safeParse({
        email: "novo@usuario.com",
        name: "Novo Usuário",
        password: "SenhaForte123",
        confirmPassword: "SenhaDiferente456",
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================
  // PAGINAÇÃO
  // =============================================

  describe("paginationSchema", () => {
    it("deve usar valores padrão", () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.sortOrder).toBe("asc");
      }
    });

    it("deve aceitar valores customizados", () => {
      const result = paginationSchema.safeParse({
        page: 5,
        limit: 50,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe("desc");
      }
    });

    const MAX_ALLOWED_LIMIT = 25000;
    const EXCEEDED_LIMIT_VALUE = 30000;

    it(`deve rejeitar limit acima de ${MAX_ALLOWED_LIMIT}`, () => {
      const result = paginationSchema.safeParse({
        limit: EXCEEDED_LIMIT_VALUE,
      });
      expect(result.success).toBe(false);
    });
  });

  // =============================================
  // VALIDATE HELPER
  // =============================================

  describe("validate function", () => {
    it("deve retornar success true para dados válidos", () => {
      const result = validate(emailSchema, "teste@email.com");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("teste@email.com");
      }
    });

    it("deve retornar errors para dados inválidos", () => {
      const result = validate(emailSchema, "invalido");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
