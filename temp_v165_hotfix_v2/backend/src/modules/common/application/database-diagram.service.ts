import { DatabaseDiagramRepository } from "../domain/database-diagram.repository";

export class DatabaseDiagramService {
  constructor(private readonly repository: DatabaseDiagramRepository) {}

  async listDiagrams() {
    return this.repository.findAll({ updatedAt: "desc" });
  }

  async getDiagram(id: string) {
    const diagram = await this.repository.findById(id);
    if (!diagram) throw new Error("NOT_FOUND");
    return diagram;
  }

  async createDiagram(data: any) {
    return this.repository.create({
      name: data.name || "Novo Diagrama",
      description: data.description,
      data: data.data || { nodes: [], edges: [] },
    });
  }

  async updateDiagram(id: string, data: any) {
    return this.repository.update(id, {
      name: data.name,
      description: data.description,
      data: data.data,
    });
  }

  async deleteDiagram(id: string) {
    return this.repository.delete(id);
  }
}
