/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03:45 **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { WorkStageService } from "@/modules/work-stages/application/work-stage.service";
import {
  WorkStageRepository,
  WorkStage,
} from "@/modules/work-stages/domain/work-stage.repository";

describe("WorkStageService", () => {
  let service: WorkStageService;
  let mockRepo: jest.Mocked<WorkStageRepository>;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findAllBySiteId: jest.fn(),
      findAllByProjectId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      listProgress: jest.fn(),
      saveProgress: jest.fn(),
      findProgressByDate: jest.fn(),
      findLinkedStagesBySite: jest.fn(),
      findLinkedStagesByProjectId: jest.fn(),
      findProductionElements: jest.fn(),
      findProductionElementsWeighted: jest.fn(),
      verifyActivityExists: jest.fn(),
    } as any;

    service = new WorkStageService(mockRepo);
  });

  describe("findAll", () => {
    it("should return empty array if no IDs provided", async () => {
      const result = await service.findAll({});
      expect(result).toEqual([]);
      expect(mockRepo.findAll).not.toHaveBeenCalled();
    });

    it("should call repo.findAll with normalized params", async () => {
      const stages: WorkStage[] = [
        {
          id: "1",
          name: "Stage 1",
          siteId: "site-1",
          projectId: "proj-1",
          productionActivityId: null,
          displayOrder: 1,
        },
      ];
      mockRepo.findAll.mockResolvedValue(stages);

      const result = await service.findAll({
        siteId: "site-1",
        projectId: "all",
      });

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          siteId: "site-1",
          projectId: null,
        }),
      );
      expect(result).toEqual(stages);
    });
  });

  describe("createStage", () => {
    it("should throw error if name is missing", async () => {
      await expect(
        service.createStage({ name: "", siteId: "site-1", displayOrder: 0 }),
      ).rejects.toThrow("Name is required");
    });

    it("should throw error if both siteId and projectId are missing", async () => {
      await expect(
        service.createStage({
          name: "Test",
          siteId: "",
          projectId: "",
          displayOrder: 0,
        }),
      ).rejects.toThrow("Site ID or Project ID is required");
    });

    it("should create stage correctly when valid", async () => {
      const dto = { name: "Test", siteId: "site-1", displayOrder: 1 };
      const created: WorkStage = {
        id: "new-id",
        ...dto,
        projectId: null,
        productionActivityId: null,
      };
      mockRepo.create.mockResolvedValue(created);

      const result = await service.createStage(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test",
          siteId: "site-1",
          projectId: null,
        }),
      );
      expect(result).toEqual(created);
    });

    it("should handle invalid activityId by setting it to null", async () => {
      const dto = {
        name: "Test",
        siteId: "site-1",
        displayOrder: 1,
        productionActivityId: "invalid-uuid",
      };
      const created: WorkStage = {
        id: "new-id",
        ...dto,
        productionActivityId: null,
        projectId: null,
      };
      mockRepo.create.mockResolvedValue(created);

      const result = await service.createStage(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productionActivityId: null,
        }),
      );
    });

    it("should verify activity existence if activityId is valid UUID", async () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      const dto = {
        name: "Test",
        siteId: "site-1",
        displayOrder: 1,
        productionActivityId: validUuid,
      };

      mockRepo.verifyActivityExists.mockResolvedValue(false);
      mockRepo.create.mockResolvedValue({
        id: "id",
        ...dto,
        productionActivityId: null,
        projectId: null,
      });

      await service.createStage(dto);

      expect(mockRepo.verifyActivityExists).toHaveBeenCalledWith(validUuid);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productionActivityId: null,
        }),
      );
    });
  });
});
