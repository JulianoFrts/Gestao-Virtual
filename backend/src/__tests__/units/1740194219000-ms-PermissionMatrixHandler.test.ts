/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03: 35 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { PermissionMatrixHandler } from "@/modules/common/infrastructure/worker/handlers/permission-matrix.handler";
import { prisma } from "@/lib/prisma/client";

// Mock do prisma
jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    $transaction: jest.fn((promises) => Promise.all(promises)),
    permissionMatrix: {
      upsert: jest.fn(),
    },
  },
}));

describe("PermissionMatrixHandler", () => {
  let handler: PermissionMatrixHandler;
  const mockPrisma = prisma as jest.Mocked<any>;

  beforeEach(() => {
    handler = new PermissionMatrixHandler();
    jest.clearAllMocks();
  });

  it("should do nothing if updates array is empty", async () => {
    await handler.handle([]);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("should process updates and call upsert in a transaction", async () => {
    const updates = [
      { levelId: "level-1", moduleId: "mod-1", isGranted: true },
      { level_id: "level-1", module_id: "mod-2", is_granted: false },
    ];

    await handler.handle(updates);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.permissionMatrix.upsert).toHaveBeenCalledTimes(2);

    // Verificar mapeamento de nomes (camelCase e snake_case)
    expect(mockPrisma.permissionMatrix.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { levelId_moduleId: { levelId: "level-1", moduleId: "mod-1" } },
        update: { isGranted: true },
      }),
    );

    expect(mockPrisma.permissionMatrix.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { levelId_moduleId: { levelId: "level-1", moduleId: "mod-2" } },
        update: { isGranted: false },
      }),
    );
  });
});
