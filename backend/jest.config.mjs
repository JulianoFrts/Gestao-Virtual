import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Ambiente de teste
  testEnvironment: "node",

  // Setup após o ambiente estar pronto
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],

  // Mapeamento de módulos (path aliases)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Padrões de teste
  testMatch: [
    "<rootDir>/src/tests/**/*.test.ts",
    "<rootDir>/src/tests/**/*.spec.ts",
  ],

  // Arquivos a ignorar
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],

  // Cobertura de código
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**/*",
    "!src/tests/**/*",
  ],

  // Limites de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Diretório de saída da cobertura
  coverageDirectory: "coverage",

  // Formato da cobertura
  coverageReporters: ["text", "lcov", "html"],

  // Timeout para testes async
  testTimeout: 10000,

  // Verbose para melhor output
  verbose: true,

  // Forçar saída após testes
  forceExit: true,

  // Detectar handles abertos
  detectOpenHandles: true,

  // Transformações
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
};

export default createJestConfig(customJestConfig);
