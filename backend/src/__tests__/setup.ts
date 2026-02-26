import { logger } from "@/lib/utils/logger";
/**
 * Setup de Testes - GESTÃO VIRTUAL Backend
 *
 * Configuração global executada antes de cada arquivo de teste
 */

import { prisma } from "@/lib/prisma/client";
import { Role } from "@prisma/client";
import { clearRateLimitStore } from "@/lib/utils/rate-limiter";
import { logger as LoggerInstance } from "@/lib/utils/logger";

// Carregar variáveis de ambiente de teste
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

// =============================================
// CONFIGURAÇÃO GLOBAL
// =============================================

// Timeout maior para testes de integração
jest.setTimeout(30000);

// =============================================
// SETUP E TEARDOWN
// =============================================

/**
 * Executado antes de todos os testes
 */
beforeAll(async () => {
  // Verificar conexão com banco de teste
  try {
    await prisma.$connect();
    LoggerInstance.debug("✓ Conectado ao banco de testes");
  } catch (error) {
    console.error("✗ Erro ao conectar ao banco de testes:", error);
    throw error;
  }
});

/**
 * Executado antes de cada teste
 */
beforeEach(() => {
  // Limpar rate limiter entre testes
  clearRateLimitStore();

  // Limpar mocks
  jest.clearAllMocks();
});

/**
 * Executado após todos os testes
 */
afterAll(async () => {
  // Desconectar do banco
  await prisma.$disconnect();
  LoggerInstance.debug("✓ Desconectado do banco de testes");
});

// =============================================
// HELPERS DE TESTE
// =============================================

/**
 * Limpa tabelas do banco (para testes de integração)
 */
export async function cleanDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== "_prisma_migrations")
    .map((name) => `"public"."${name}"`)
    .join(", ");

  if (tables.length > 0) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error) {
      console.error("Erro ao limpar banco:", error);
    }
  }
}

/**
 * Cria usuário de teste
 */
export async function createTestUser(data?: {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
}) {
  const bcrypt = await import("bcryptjs");

  return prisma.user.create({
    data: {
      name: data?.name ?? "Test User",
      authCredential: {
        create: {
          email: data?.email ?? `test-${Date.now() /* deterministic-bypass */ /* bypass-audit */}@test.com`,
          password: await bcrypt.hash(data?.password ?? "TestPassword123", 10),
          role: data?.role ?? Role.OPERATIONAL,
          status: "ACTIVE",
          emailVerified: new Date() /* deterministic-bypass */ /* bypass-audit */,
          systemUse: true,
        },
      },
    },
  });
}

/**
 * Cria admin de teste
 */
export async function createTestAdmin(data?: {
  email?: string;
  name?: string;
  password?: string;
}) {
  return createTestUser({
    ...data,
    role: Role.SYSTEM_ADMIN,
  });
}

// =============================================
// MOCKS GLOBAIS
// =============================================

// Injetar logger global para testes
(global as unknown).logger = LoggerInstance;

// Mock do console em produção para não poluir output
if (process.env.NODE_ENV === "test") {
  global.console = {
    ...console,
    // Descomente para silenciar logs durante testes
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
  };
}
