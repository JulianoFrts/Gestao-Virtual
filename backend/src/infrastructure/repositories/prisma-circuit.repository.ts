import { prisma } from "@/lib/prisma/client";
import {
  Circuit,
  CircuitRepository,
} from "@/core/circuit/domain/circuit.repository";

export class PrismaCircuitRepository implements CircuitRepository {
  async save(circuit: Circuit): Promise<Circuit> {
    const { id, ...data } = circuit;

    if (id) {
      return (await prisma.circuit.update({
        where: { id },
        data: data as any,
      })) as unknown as Circuit;
    }

    return (await prisma.circuit.create({
      data: data as any,
    })) as unknown as Circuit;
  }

  async saveMany(circuits: Circuit[]): Promise<Circuit[]> {
    const results: Circuit[] = [];
    for (const c of circuits) {
      results.push(await this.save(c));
    }
    return results;
  }

  async findById(id: string): Promise<Circuit | null> {
    return (await prisma.circuit.findUnique({
      where: { id },
    })) as unknown as Circuit | null;
  }

  async findByProject(projectId: string): Promise<Circuit[]> {
    return (await prisma.circuit.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    })) as unknown as Circuit[];
  }

  async deleteById(id: string): Promise<void> {
    await prisma.circuit.delete({ where: { id } });
  }
}
