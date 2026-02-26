import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import {
  Circuit,
  CircuitRepository,
} from "@/modules/circuit/domain/circuit.repository";

export class PrismaCircuitRepository implements CircuitRepository {
  async save(circuit: Circuit): Promise<Circuit> {
    const { id, ...data } = circuit;

    if (id) {
      const updated = await prisma.circuit.update({
        where: { id },
        data: data as Prisma.CircuitUpdateInput,
      });
      return updated as unknown as Circuit;
    }

    const created = await prisma.circuit.create({
      data: data as Prisma.CircuitCreateInput,
    });
    return created as unknown as Circuit;
  }

  async saveMany(circuits: Circuit[]): Promise<Circuit[]> {
    const results: Circuit[] = [];
    for (const c of circuits) {
      results.push(await this.save(c));
    }
    return results;
  }

  async findById(id: string): Promise<Circuit | null> {
    const result = await prisma.circuit.findUnique({
      where: { id },
    });
    return result as unknown as Circuit | null;
  }

  async findByProject(projectId: string): Promise<Circuit[]> {
    return (await prisma.circuit.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    })) as Circuit[];
  }

  async deleteById(id: string): Promise<void> {
    await prisma.circuit.delete({ where: { id } });
  }
}
