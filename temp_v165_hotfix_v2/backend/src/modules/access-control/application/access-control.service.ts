import { AccessControlRepository } from "../domain/access-control.repository";

export class AccessControlService {
  constructor(private readonly repository: AccessControlRepository) {}

  async listLevels(name?: string) {
    if (name) {
      return this.repository.findLevelByName(name);
    }
    return this.repository.findAllLevels();
  }

  async createLevel(data: {
    name: string;
    description?: string;
    rank?: number;
  }) {
    const existing = await this.repository.findLevelByName(data.name);
    if (existing) {
      throw new Error("LEVEL_ALREADY_EXISTS");
    }

    return this.repository.createLevel({
      name: data.name,
      description: data.description,
      rank: data.rank || 0,
    });
  }

  async listModules() {
    return this.repository.findAllModules();
  }

  async processModules(items: any[]) {
    const dataToInsert = items.map((m) => ({
      id: m.id || undefined,
      code: m.code,
      name: m.name,
      category: m.category || "Geral",
    }));

    return this.repository.createModules(dataToInsert);
  }

  async removeModules(ids: string[]) {
    return this.repository.deleteModules(ids);
  }
}
