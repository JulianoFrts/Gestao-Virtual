import { Circuit, CircuitRepository } from "../domain/circuit.repository";

export class CircuitService {
  constructor(private circuitRepository: CircuitRepository) {}

  async getProjectCircuits(projectId: string): Promise<Circuit[]> {
    return await this.circuitRepository.findByProject(projectId);
  }

  async saveCircuit(circuit: Circuit): Promise<Circuit> {
    return await this.circuitRepository.save(circuit);
  }

  async deleteCircuit(id: string): Promise<void> {
    await this.circuitRepository.deleteById(id);
  }
}
