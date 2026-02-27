/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03: 45 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { TowerService } from "@/core/tower/application/tower.service";
import { Tower, TowerRepository } from "@/core/tower/domain/tower.repository";

describe("TowerService", () => {
  let towerService: TowerService;
  let mockTowerRepository: jest.Mocked<TowerRepository>;

  beforeEach(() => {
    mockTowerRepository = {
      save: jest.fn(),
      saveMany: jest.fn(),
      findById: jest.fn(),
      findByObjectId: jest.fn(),
      findByProject: jest.fn(),
      deleteByProject: jest.fn(),
    } as unknown;

    towerService = new TowerService(mockTowerRepository);
  });

  it("should save towers correctly mapping DTOs to entities", async () => {
    const inputData = {
      project_id: "proj-1",
      object_id: "tower-1",
      object_height: 30,
    };

    mockTowerRepository.saveMany.mockResolvedValue([
      { projectId: "proj-1", objectId: "tower-1", objectHeight: 30 } as Tower,
    ]);

    const result = await towerService.saveTowers(inputData);

    expect(mockTowerRepository.saveMany).toHaveBeenCalledWith([
      expect.objectContaining({
        projectId: "proj-1",
        objectId: "tower-1",
        objectHeight: 30,
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeDefined();
    if (result[0]) {
      expect(result[0].objectId).toBe("tower-1");
    }
  });

  it("should throw error for invalid tower data", () => {
    expect(() => towerService.saveTowers(null)).toThrow();
  });

  it("should call deleteByProject with correct id", async () => {
    mockTowerRepository.deleteByProject.mockResolvedValue(5);

    const result = await towerService.deleteAllFromProject("proj-123");

    expect(mockTowerRepository.deleteByProject).toHaveBeenCalledWith(
      "proj-123",
    );
    expect(result).toBe(5);
  });
});
