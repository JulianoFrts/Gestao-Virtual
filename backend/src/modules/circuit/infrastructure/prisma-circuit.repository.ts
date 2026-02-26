import { prisma } from "@/lib/prisma/client";
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
        data: data as unknown,
      });
      return this.mapFromPrisma(updated);
    }

    const created = await prisma.circuit.create({
      data: data as unknown,
    });
    return this.mapFromPrisma(created);
  }

  async saveMany(circuits: Circuit[]): Promise<Circuit[]> {
    const results: Circuit[] = [];
    for (const c of circuits) {
      results.push(await this.save(c));
    }
    return results;
  }

  async findById(id: string): Promise<Circuit | null> {
    const found = await prisma.circuit.findUnique({
      where: { id },
    });
    return found ? this.mapFromPrisma(found) : null;
  }

  async findByProject(projectId: string): Promise<Circuit[]> {
    const found = await prisma.circuit.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    });
    return found.map(this.mapFromPrisma);
  }

  private mapFromPrisma(prismaCircuit: unknown): Circuit {
    return {
      id: prismaCircuit.id,
      projectId: prismaCircuit.projectId,
      name: prismaCircuit.name,
      type: prismaCircuit.type,
      color: prismaCircuit.color,
      voltageKv: prismaCircuit.voltageKv
        ? Number(prismaCircuit.voltageKv)
        : undefined,
      isActive: prismaCircuit.isActive,
      createdAt: prismaCircuit.createdAt,
      updatedAt: prismaCircuit.updatedAt,
    };
  }

  async deleteById(id: string): Promise<void> {
    await prisma.circuit.delete({ where: { id } });
  }
}
