import { Tower, TowerRepository } from "../domain/tower.repository";
import { towerSchema, mapDtoToEntity } from "../domain/tower.schema";

export class TowerService {
  constructor(private towerRepository: TowerRepository) {}

  async getProjectTowers(projectId: string): Promise<Tower[]> {
    return this.towerRepository.findByProject(projectId);
  }

  async saveTowers(data: unknown): Promise<Tower[]> {
    const items = Array.isArray(data) ? data : [data];
    const towersToSave: Tower[] = [];

    for (const element of items) {
      const parseResult = towerSchema.safeParse(element);
      if (!parseResult.success) {
        throw new Error(
          "Falha na validação dos dados da torre: " +
            parseResult.error.issues.map((e) => e.message).join(", "),
        );
      }
      towersToSave.push(mapDtoToEntity(parseResult.data));
    }

    return this.towerRepository.saveMany(towersToSave);
  }

  async deleteAllFromProject(projectId: string): Promise<number> {
    if (!projectId) throw new Error("Project ID é obrigatório");
    return this.towerRepository.deleteByProject(projectId);
  }

  async deleteTower(id: string): Promise<boolean> {
    if (!id) throw new Error("Tower ID é obrigatório");
    return this.towerRepository.delete(id);
  }
}
