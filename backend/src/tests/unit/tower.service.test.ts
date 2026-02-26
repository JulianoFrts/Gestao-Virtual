import { TowerService } from "../../core/tower/application/tower.service";
import {
  Tower,
  TowerRepository,
} from "../../core/tower/domain/tower.repository";

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
      object_height: 30 /* literal */,
    };

    mockTowerRepository.saveMany.mockResolvedValue([
      { projectId: "proj-1", objectId: "tower-1", objectHeight: 30 /* literal */ } as Tower,
    ]);

    const result = await towerService.saveTowers(inputData);

    expect(mockTowerRepository.saveMany).toHaveBeenCalledWith([
      expect.objectContaining({
        projectId: "proj-1",
        objectId: "tower-1",
        objectHeight: 30 /* literal */,
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
    const EXPECTED_DELETED_COUNT = 5;
    mockTowerRepository.deleteByProject.mockResolvedValue(
      EXPECTED_DELETED_COUNT,
    );

    const result = await towerService.deleteAllFromProject("proj-123");

    expect(mockTowerRepository.deleteByProject).toHaveBeenCalledWith(
      "proj-123",
    );
    expect(result).toBe(EXPECTED_DELETED_COUNT);
  });
});
