export interface Circuit {
  id?: string;
  projectId: string;
  name: string;
  type: string; // SINGLE, PARALLEL
  color?: string;
  voltageKv?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CircuitRepository {
  save(circuit: Circuit): Promise<Circuit>;
  saveMany(circuits: Circuit[]): Promise<Circuit[]>;
  findById(id: string): Promise<Circuit | null>;
  findByProject(projectId: string): Promise<Circuit[]>;
  deleteById(id: string): Promise<void>;
}
